import React, { useState } from 'react';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Grid from '@material-ui/core/Grid';

export default function PaymentModal({ open, handleClose, handlePayment }) {
    const [name, setName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (!name || !cardNumber || !expiry || !cvv) {
            setError("All fields are required.");
            return;
        }

        // Mock Stripe Token Structure
        const mockToken = {
            id: `tok_mock_${Date.now()}`,
            email: "user@example.com", // Dummy email
            card: {
                id: `card_mock_${Date.now()}`,
                brand: "Visa",
                last4: cardNumber.slice(-4),
                exp_month: expiry.split('/')[0],
                exp_year: 2030, // Mock year
                name: name
            }
        };

        handlePayment(mockToken);
        handleClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} aria-labelledby="form-dialog-title">
            <DialogTitle id="form-dialog-title" style={{ color: '#000000ff', fontWeight: 'bold' }}>ZylkerKart Secure Payment</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Please enter your card details to complete the purchase.
                </DialogContentText>

                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            autoFocus
                            margin="dense"
                            id="name"
                            label="Name on Card"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            margin="dense"
                            id="cardNumber"
                            label="Card Number"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            margin="dense"
                            id="expiry"
                            label="MM/YY"
                            type="text"
                            fullWidth
                            variant="outlined"
                            value={expiry}
                            onChange={(e) => setExpiry(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField
                            margin="dense"
                            id="cvv"
                            label="CVV"
                            type="password"
                            fullWidth
                            variant="outlined"
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value)}
                        />
                    </Grid>
                </Grid>
                {error && <p style={{ color: 'red' }}>{error}</p>}

            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="primary">
                    Cancel
                </Button>
                <Button onClick={handleSubmit} style={{ backgroundColor: '#e01a2b', color: 'white' }}>
                    Pay Now
                </Button>
            </DialogActions>
        </Dialog>
    );
}
