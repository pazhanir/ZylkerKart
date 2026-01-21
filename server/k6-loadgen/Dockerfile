# Start with k6 image
FROM grafana/k6:latest

# Install Node.js (Alpine based)
USER root
RUN apk add --update nodejs npm

WORKDIR /home/k6

# Copy Agent Code
COPY package.json .
RUN npm install
COPY agent.js .

# Copy k6 scripts
COPY . .

# Expose Agent API Port
EXPOSE 80

# Run Agent instead of k6 directly
ENTRYPOINT ["npm", "start"]
