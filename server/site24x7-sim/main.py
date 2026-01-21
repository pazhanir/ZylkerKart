import logging
import uuid
from datetime import datetime
from typing import List, Optional
from enum import Enum
import asyncio
import json
import requests
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from kubernetes import client, config
from kubernetes.stream import stream

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("site24x7-sim")

# In-Cluster Config
try:
    config.load_incluster_config()
except:
    try:
        config.load_kube_config() # Local fallback
    except:
        pass

app = FastAPI()
templates = Jinja2Templates(directory="templates")

# ... (Logging setup remains) ...

# --- Data Models & State ---

class ExperimentType(str, Enum):
    POD_KILL = "POD_KILL"
    CPU_PRESSURE = "CPU_PRESSURE"
    MEMORY_PRESSURE = "MEMORY_PRESSURE"
    NODE_CPU_PRESSURE = "NODE_CPU_PRESSURE"
    NODE_MEMORY_PRESSURE = "NODE_MEMORY_PRESSURE"
    DISK_PRESSURE = "DISK_PRESSURE"
    NODE_DISK_PRESSURE = "NODE_DISK_PRESSURE"
    CRASH_LOOP = "CRASH_LOOP"

# ...

@app.get("/api/nodes")
def list_nodes():
    try:
        v1 = client.CoreV1Api()
        nodes = v1.list_node()
        return {"nodes": [n.metadata.name for n in nodes.items]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



class ExperimentStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    STOPPED = "STOPPED"
    FAILED = "FAILED"

class CreateExperimentRequest(BaseModel):
    namespace: str
    target_pod: str 
    type: ExperimentType = ExperimentType.POD_KILL  # Default to Kill
    start_time: str 
    end_time: str   
    interval_seconds: int = 30 
    intensity: int = 100 # Percentage (1-100) 

class LoadGenRequest(BaseModel):
    visitor_rpm: int = 0
    shopper_rpm: int = 0
    searcher_rpm: int = 0
    error_rpm: int = 0

class Experiment:
    def __init__(self, id: str, req: CreateExperimentRequest, label_selector: str):
        self.id = id
        self.req = req
        self.label_selector = label_selector
        self.status = ExperimentStatus.SCHEDULED
        self.created_at = datetime.now()
        self.last_run = None
        self.logs = []
    
    def log(self, msg):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.logs.append(f"[{timestamp}] {msg}")
        if len(self.logs) > 50:
            self.logs.pop(0)

experiments: List[Experiment] = []

# --- Helper Functions ---

def get_label_selector_for_pod(namespace, pod_name):
    # ... (remains same) ...
    v1 = client.CoreV1Api()
    try:
        pod = v1.read_namespaced_pod(pod_name, namespace)
        labels = pod.metadata.labels
        if 'app' in labels:
            return f"app={labels['app']}"
        return None
    except Exception as e:
        logger.error(f"Could not find pod {pod_name}: {e}")
        return None

def get_running_pods(namespace, label_selector):
    v1 = client.CoreV1Api()
    pods = v1.list_namespaced_pod(namespace, label_selector=label_selector)
    return [p for p in pods.items if p.status.phase == "Running"]

def kill_random_pod(namespace, label_selector):
    running_pods = get_running_pods(namespace, label_selector)
    if not running_pods:
        return None, "No running pods"
    
    target = running_pods[0] # Simple selection
    name = target.metadata.name
    
    v1 = client.CoreV1Api()
    try:
        v1.delete_namespaced_pod(name, namespace)
        return name, "Killed successfully"
    except Exception as e:
        return None, str(e)

def inject_cpu_pressure(namespace, label_selector, intensity=100):
    running_pods = get_running_pods(namespace, label_selector)
    if not running_pods:
        return None, "No running pods"
    
    target = running_pods[0]
    name = target.metadata.name
    
    v1 = client.CoreV1Api()
    try:
        # Simple loop. Intensity > 50 -> 2 loops, else 1 loop
        threads = 2 if intensity > 50 else 1
        cmd_str = ""
        for _ in range(threads):
            cmd_str += "nohup sh -c 'while true; do :; done' > /dev/null 2>&1 & "
        
        cmd = ["/bin/sh", "-c", cmd_str.strip()]
        resp = stream(v1.connect_get_namespaced_pod_exec, name, namespace,
                      command=cmd,
                      stderr=True, stdin=False,
                      stdout=True, tty=False)
        return name, f"Injected CPU Stress ({threads} threads)"
    except Exception as e:
        return None, str(e)

def parse_memory_limit(mem_str):
    # Convert K8s memory string (512Mi, 1Gi) to MB
    if not mem_str: return 512 # Default assumption
    if mem_str.endswith('Mi'): return int(mem_str[:-2])
    if mem_str.endswith('Gi'): return int(mem_str[:-2]) * 1024
    if mem_str.endswith('M'): return int(mem_str[:-1])
    return 512

def inject_memory_pressure(namespace, label_selector, intensity=100):
    running_pods = get_running_pods(namespace, label_selector)
    if not running_pods:
        return None, "No running pods"
    
    target = running_pods[0]
    name = target.metadata.name
    
    v1 = client.CoreV1Api()
    try:
        # 1. Get Pod Limits
        pod = v1.read_namespaced_pod(name, namespace)
        # Assuming first container is the target
        limits = pod.spec.containers[0].resources.limits
        mem_limit_str = limits.get('memory') if limits else None
        
        limit_mb = parse_memory_limit(mem_limit_str)
        target_mb = int((limit_mb * intensity) / 100)
        
        # Ensure at least 10MB
        if target_mb < 10: target_mb = 10
        
        # DD to /dev/shm
        cmd = ["/bin/sh", "-c", f"dd if=/dev/zero of=/dev/shm/stress-mem bs=1M count={target_mb}"]
        resp = stream(v1.connect_get_namespaced_pod_exec, name, namespace,
                      command=cmd,
                      stderr=True, stdin=False,
                      stdout=True, tty=False)
        return name, f"Injected Memory Stress ({target_mb}MB / {intensity}%)"
    except Exception as e:
        return None, str(e)

def inject_disk_pressure(namespace, label_selector, intensity=100):
    running_pods = get_running_pods(namespace, label_selector)
    if not running_pods:
        return None, "No running pods"
    
    target = running_pods[0]
    name = target.metadata.name
    
    v1 = client.CoreV1Api()
    try:
        # Intensity 100% = 1GB (Safe Cap), 10% = 100MB
        mb = int(1024 * (intensity/100))
        if mb < 10: mb = 10
        
        # Write to /tmp
        cmd = ["/bin/sh", "-c", f"dd if=/dev/zero of=/tmp/chaos-disk-burn.dat bs=1M count={mb}"]
        resp = stream(v1.connect_get_namespaced_pod_exec, name, namespace,
                      command=cmd,
                      stderr=True, stdin=False,
                      stdout=True, tty=False)
        return name, f"Injected Disk Pressure ({mb}MB)"
    except Exception as e:
        return None, str(e)

def cleanup_disk_pressure(namespace, label_selector):
    running_pods = get_running_pods(namespace, label_selector)
    if not running_pods: return
    
    # Try to clean all matching pods just in case
    v1 = client.CoreV1Api()
    for p in running_pods:
        try:
            name = p.metadata.name
            cmd = ["/bin/sh", "-c", "rm -f /tmp/chaos-disk-burn.dat"]
            stream(v1.connect_get_namespaced_pod_exec, name, namespace,
                   command=cmd, stderr=False, stdin=False, stdout=False, tty=False)
        except: pass
    return "Cleaned disk pressure files"

def create_node_stress_pod(namespace, node_name, type, intensity):
    v1 = client.CoreV1Api()
    name = f"chaos-node-{node_name}-{int(datetime.now().timestamp())}"
    
    # Command Logic
    cmd = []
    if type == ExperimentType.NODE_CPU_PRESSURE:
        # Multiple threads for node pressure
        threads = 4 if intensity > 50 else 2
        cmd_str = ""
        for _ in range(threads):
            cmd_str += "nohup sh -c 'while true; do :; done' > /dev/null 2>&1 & "
        cmd = ["/bin/sh", "-c", cmd_str + "wait"]
        
    elif type == ExperimentType.NODE_MEMORY_PRESSURE:
        # Allocate larger chunk for Node (e.g., 1GB - 2GB)
        # Assuming ~4GB node, 50% = 2GB.
        mb = int(2048 * (intensity/100))
        cmd = ["/bin/sh", "-c", f"dd if=/dev/zero of=/dev/shm/stress-node bs=1M count={mb} && sleep 3600"]
    
    elif type == ExperimentType.NODE_DISK_PRESSURE:
        # Fill Node Disk (Mounts /tmp from HostPath usually, but here simulating via emptyDir if possible or mapped volume)
        # NOTE: For true node disk pressure, we need a HostPath mount. 
        # Here we will write to the container's scratch space which if large enough can trigger eviction, 
        # OR we assume the generic stress pod has restricted limits. 
        # A safer "rogue" pod method is to just consume a large chunk (e.g. 5-10GB).
        gb = int(10 * (intensity/100)) # Max 10GB
        if gb < 1: gb = 1
        # Write 1GB chunks
        cmd = ["/bin/sh", "-c", f"dd if=/dev/zero of=/tmp/node-disk-burn.dat bs=1G count={gb} && sleep 3600"]

    pod_manifest = client.V1Pod(
        metadata=client.V1ObjectMeta(name=name, labels={"app": "chaos-node-stress", "type": str(type.value)}),
        spec=client.V1PodSpec(
            node_selector={"kubernetes.io/hostname": node_name},
            containers=[
                client.V1Container(
                    name="stress",
                    image="busybox", # Use lightweight image
                    command=cmd,
                    resources=client.V1ResourceRequirements(
                        requests={"cpu": "100m", "memory": "100Mi"} # Min request to get scheduled
                    )
                )
            ],
            restart_policy="Never"
        )
    )
    
    try:
        v1.create_namespaced_pod(namespace, pod_manifest)
        return name, f"Created stress pod on {node_name}"
    except Exception as e:
        return None, str(e)

def delete_node_stress_pods(namespace, node_name):
    # Cleanup any chaos pods for this node
    v1 = client.CoreV1Api()
    try:
        pods = v1.list_namespaced_pod(namespace, label_selector="app=chaos-node-stress")
        deleted = []
        for p in pods.items:
            # Check if it belongs to our node (simple name check or node check)
            if p.spec.node_name == node_name:
                v1.delete_namespaced_pod(p.metadata.name, namespace)
                deleted.append(p.metadata.name)
        return len(deleted)
    except:
        return 0

# ... (Previous helper functions) ...

@app.post("/api/chaos/create")
def create_experiment(req: CreateExperimentRequest):
    # Determine Selector or Node Target
    target = req.target_pod
    
    if "NODE" in req.type:
        # Target is the Node Name directly
        target = req.target_pod
    else:
        # Resolve label selector from Deployment
        v1 = client.AppsV1Api()
        try:
            dep = v1.read_namespaced_deployment(req.target_pod, req.namespace)
            labels = dep.spec.selector.match_labels
            target = ",".join([f"{k}={v}" for k, v in labels.items()])
        except Exception as e:
             raise HTTPException(status_code=400, detail=f"Could not find deployment {req.target_pod}: {str(e)}")
    
    # 2. Create Experiment
    exp_id = str(uuid.uuid4())[:8]
    exp = Experiment(exp_id, req, target)
    experiments.append(exp)
    
    return {"status": "success", "id": exp_id, "message": "Experiment Scheduled"}

# ... (Main.py modifications for scheduler) ...

def create_node_stress_pod(namespace, node_name, type, intensity):
    v1 = client.CoreV1Api()
    name = f"chaos-node-{node_name}-{int(datetime.now().timestamp())}"
    
    # Command Logic
    cmd = []
    if type == ExperimentType.NODE_CPU_PRESSURE:
        # Multiple threads for node pressure
        threads = 4 if intensity > 50 else 2
        cmd_str = ""
        for _ in range(threads):
            cmd_str += "nohup sh -c 'while true; do :; done' > /dev/null 2>&1 & "
        cmd = ["/bin/sh", "-c", cmd_str + "wait"]
        
    elif type == ExperimentType.NODE_MEMORY_PRESSURE:
        # Allocate larger chunk for Node (e.g., 1GB - 2GB)
        # Assuming ~4GB node, 50% = 2GB.
        mb = int(2048 * (intensity/100))
        cmd = ["/bin/sh", "-c", f"dd if=/dev/zero of=/dev/shm/stress-node bs=1M count={mb} && sleep 3600"]

    pod_manifest = client.V1Pod(
        metadata=client.V1ObjectMeta(name=name, labels={"app": "chaos-node-stress", "type": type}),
        spec=client.V1PodSpec(
            node_selector={"kubernetes.io/hostname": node_name},
            containers=[
                client.V1Container(
                    name="stress",
                    image="busybox", # Use lightweight image
                    command=cmd,
                    resources=client.V1ResourceRequirements(
                        requests={"cpu": "100m", "memory": "100Mi"} # Min request to get scheduled
                    )
                )
            ],
            restart_policy="Never"
        )
    )
    
    try:
        v1.create_namespaced_pod(namespace, pod_manifest)
        return name, f"Created stress pod on {node_name}"
    except Exception as e:
        return None, str(e)

def delete_node_stress_pods(namespace, node_name):
    # Cleanup any chaos pods for this node
    v1 = client.CoreV1Api()
    try:
        pods = v1.list_namespaced_pod(namespace, label_selector="app=chaos-node-stress")
        deleted = []
        for p in pods.items:
            # Check if it belongs to our node (simple name check or node check)
            if p.spec.node_name == node_name:
                v1.delete_namespaced_pod(p.metadata.name, namespace)
                deleted.append(p.metadata.name)
        return getattr(deleted, 'len', len)(deleted)
    except:
        return 0

def inject_crash_loop(namespace, deployment_name):
    v1 = client.AppsV1Api()
    try:
        dep = v1.read_namespaced_deployment(deployment_name, namespace)
        
        if dep.metadata.annotations and "site24x7-sim/original-state" in dep.metadata.annotations:
             return None, "Already in CrashLoop"

        container = dep.spec.template.spec.containers[0]
        original_state = {
            "command": container.command,
            "args": container.args
        }
        
        if not dep.metadata.annotations: dep.metadata.annotations = {}
        dep.metadata.annotations["site24x7-sim/original-state"] = json.dumps(original_state)
        
        container.command = ["/bin/sh", "-c", "exit 1"]
        container.args = None 
        
        v1.patch_namespaced_deployment(deployment_name, namespace, dep)
        return deployment_name, "Injected CrashLoop (Exit 1)"
    except Exception as e:
        return None, str(e)

def cleanup_crash_loop(namespace, deployment_name):
    v1 = client.AppsV1Api()
    try:
        dep = v1.read_namespaced_deployment(deployment_name, namespace)
        
        if not dep.metadata.annotations or "site24x7-sim/original-state" not in dep.metadata.annotations:
            return None, "No state to restore"
            
        original_state = json.loads(dep.metadata.annotations["site24x7-sim/original-state"])
        
        container = dep.spec.template.spec.containers[0]
        container.command = original_state["command"]
        container.args = original_state["args"]
        
        del dep.metadata.annotations["site24x7-sim/original-state"]
        
        v1.patch_namespaced_deployment(deployment_name, namespace, dep)
        return deployment_name, "Restored Deployment"
    except Exception as e:
        return None, str(e)

async def scheduler_loop():
    logger.info("Scheduler loop started.")
    while True:
        try:
            now = datetime.utcnow()
            for exp in experiments:
                if exp.status in [ExperimentStatus.COMPLETED, ExperimentStatus.STOPPED, ExperimentStatus.FAILED]:
                    continue
                
                # Parse times
                try:
                    start_str = exp.req.start_time.replace('Z', '')
                    end_str = exp.req.end_time.replace('Z', '')
                    start_dt = datetime.fromisoformat(start_str)
                    end_dt = datetime.fromisoformat(end_str)
                except ValueError:
                    exp.status = ExperimentStatus.FAILED
                    continue

                # Start Experiment
                if exp.status == ExperimentStatus.SCHEDULED and now >= start_dt:
                    exp.status = ExperimentStatus.RUNNING
                    exp.log(f"Started {exp.req.type} ({exp.req.intensity}%)")
                    
                    # Immediate Start Action for Stress (Node or Pod)
                    if "NODE" in exp.req.type.value:
                        name, msg = create_node_stress_pod(exp.req.namespace, exp.req.target_pod, exp.req.type, exp.req.intensity)
                        exp.log(f"Node Stress: {msg}")
                    elif exp.req.type == ExperimentType.CRASH_LOOP:
                        name, msg = inject_crash_loop(exp.req.namespace, exp.req.target_pod)
                        exp.log(f"CrashLoop: {msg}")

                # End Experiment
                if exp.status == ExperimentStatus.RUNNING and now >= end_dt:
                    exp.status = ExperimentStatus.COMPLETED
                    exp.log("Experiment completed.")
                    
                    # Cleanup
                    if exp.req.type in [ExperimentType.CPU_PRESSURE, ExperimentType.MEMORY_PRESSURE]:
                         kill_random_pod(exp.req.namespace, exp.label_selector)
                         exp.log("Cleanup: Killed pod.")
                    elif "NODE" in exp.req.type.value:
                        count = delete_node_stress_pods(exp.req.namespace, exp.req.target_pod)
                        exp.log(f"Cleanup: Deleted {count} stress pods.")
                    elif exp.req.type == ExperimentType.CRASH_LOOP:
                        name, msg = cleanup_crash_loop(exp.req.namespace, exp.req.target_pod)
                        exp.log(f"Cleanup: {msg}")
                    elif exp.req.type == ExperimentType.DISK_PRESSURE:
                        cleanup_disk_pressure(exp.req.namespace, exp.label_selector)
                        exp.log("Cleanup: Removed large files.")
                    continue
                
                # Running Loop (Intervals)
                if exp.status == ExperimentStatus.RUNNING:
                     # Only Pod Kill needs repeated interval execution
                     if exp.req.type == ExperimentType.POD_KILL:
                         if exp.last_run is None or (now - exp.last_run).total_seconds() >= exp.req.interval_seconds:
                             name, msg = kill_random_pod(exp.req.namespace, exp.label_selector)
                             exp.log(f"⚡ Killed {name}")
                             exp.last_run = now
                     elif exp.req.type in [ExperimentType.CPU_PRESSURE, ExperimentType.MEMORY_PRESSURE, ExperimentType.DISK_PRESSURE]:
                         # Continuous pod stress: Run ONCE
                         if exp.last_run is None:
                             name, msg = None, ""
                             if exp.req.type == ExperimentType.CPU_PRESSURE:
                                 name, msg = inject_cpu_pressure(exp.req.namespace, exp.label_selector, exp.req.intensity)
                             elif exp.req.type == ExperimentType.MEMORY_PRESSURE:
                                 name, msg = inject_memory_pressure(exp.req.namespace, exp.label_selector, exp.req.intensity)
                             elif exp.req.type == ExperimentType.DISK_PRESSURE:
                                 name, msg = inject_disk_pressure(exp.req.namespace, exp.label_selector, exp.req.intensity)
                             
                             if name:
                                 exp.log(f"⚡ Stress: {name} ({msg})")
                                 exp.last_run = now
                             else:
                                 exp.log(f"⚠️ Failed: {msg}")

        except Exception as e:
            logger.error(f"Scheduler Error: {e}")
            
        await asyncio.sleep(1)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(scheduler_loop())

# --- Routes ---

@app.get("/", response_class=HTMLResponse)
async def read_dashboard(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/deployments")
def list_deployments(namespace: str = "zylkerkart"):
    try:
        v1 = client.AppsV1Api()
        deps = v1.list_namespaced_deployment(namespace)
        return {"deployments": [d.metadata.name for d in deps.items]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chaos/create")
def create_experiment(req: CreateExperimentRequest):
    # Determine Selector or Node Target
    target = req.target_pod
    
    if "NODE" in req.type or req.type == ExperimentType.CRASH_LOOP or req.type == ExperimentType.NODE_DISK_PRESSURE:
        # Target is the Node Name or Deployment Name directly
        target = req.target_pod
    else:
        # Resolve label selector from Deployment
        v1 = client.AppsV1Api()
        try:
            dep = v1.read_namespaced_deployment(req.target_pod, req.namespace)
            labels = dep.spec.selector.match_labels
            target = ",".join([f"{k}={v}" for k, v in labels.items()])
        except Exception as e:
             raise HTTPException(status_code=400, detail=f"Could not find deployment {req.target_pod}: {str(e)}")
    
    # 2. Create Experiment
    exp_id = str(uuid.uuid4())[:8]
    exp = Experiment(exp_id, req, target)
    experiments.append(exp)
    
    return {"status": "success", "id": exp_id, "message": "Experiment Scheduled"}

@app.get("/api/chaos/list")
def list_experiments():
    # Convert objects to JSON-friendly dicts
    data = []
    for e in experiments:
        data.append({
            "id": e.id,
            "target": e.label_selector,
            "status": e.status,
            "type": e.req.type,
            "start": e.req.start_time,
            "end": e.req.end_time,
            "interval": e.req.interval_seconds,
            "logs": e.logs[-3:] # Send last 3 logs for preview
        })
    # Return newest first
    return {"experiments": list(reversed(data))}

@app.post("/api/chaos/stop/{exp_id}")
def stop_experiment(exp_id: str):
    for e in experiments:
        if e.id == exp_id:
            if e.status in [ExperimentStatus.RUNNING, ExperimentStatus.SCHEDULED]:
                e.status = ExperimentStatus.STOPPED
                e.log("Experiment manually stopped.")
                return {"status": "success", "message": "Experiment stopped"}
            return {"status": "error", "message": f"Experiment is already {e.status}"}
    raise HTTPException(status_code=404, detail="Experiment not found")

# --- Load Generator Proxy ---
LOADGEN_URL = "http://zylkerkart-loadgen.site24x7-operator"

@app.get("/api/loadgen/status")
def get_loadgen_status():
    try:
        res = requests.get(f"{LOADGEN_URL}/status", timeout=2)
        return res.json()
    except Exception as e:
        logger.error(f"LoadGen Status Failed: {e}")
        return {"running": False, "config": {}, "error": "Unreachable"}

@app.post("/api/loadgen/start")
def start_loadgen(req: LoadGenRequest):
    try:
        res = requests.post(f"{LOADGEN_URL}/start", json=req.dict(), timeout=5)
        return res.json()
    except Exception as e:
        logger.error(f"LoadGen Start Failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to reach Load Generator")

@app.post("/api/loadgen/stop")
def stop_loadgen():
    try:
        res = requests.post(f"{LOADGEN_URL}/stop", timeout=5)
        return res.json()
    except Exception as e:
        logger.error(f"LoadGen Stop Failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to reach Load Generator")

@app.get("/health")
def health_check():
    return {"status": "ok"}
