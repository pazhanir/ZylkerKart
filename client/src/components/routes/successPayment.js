import React, { useEffect } from 'react'
import log from 'loglevel'
import { Grid, Paper, Button, Divider, Typography } from "@material-ui/core";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { BadRequest } from "../ui/error/badRequest";
import {
    RESET_ADD_TO_CART, RESET_CART_TOTAL, RESET_DELIVERY_CHARGES,
    RESET_PAYMENT_RESPONSE, RESET_SHIPPING_ADDRESS, RESET_SHIPPING_OPTION, RESET_SHOPPING_BAG_PRODUCTS,
} from "../../actions/types";
import { DocumentTitle } from "../ui/documentTitle";
import { GenericErrorMsg } from "../ui/error/GenericErrorMsg";

const resetStates = [RESET_ADD_TO_CART, RESET_CART_TOTAL, RESET_DELIVERY_CHARGES,
    RESET_PAYMENT_RESPONSE, RESET_SHIPPING_ADDRESS, RESET_SHIPPING_OPTION, RESET_SHOPPING_BAG_PRODUCTS]

export const SuccessPayment = () => {
    const dispatch = useDispatch()
    const shoppingBagProducts = useSelector(state => state.shoppingBagProductReducer)
    let cartTotal = useSelector(state => state.cartTotalReducer)
    const shippingAddressForm = useSelector(state => state.form.shippingAddressForm ?
        state.form.shippingAddressForm.values : null)
    const shippingOption = useSelector(state => state.shippingOptionReducer)
    const addToCart = useSelector(state => state.addToCartReducer)
    const deliveryCharges = useSelector(state => state.deliveryChargesReducer)
    const paymentResponse = useSelector(state => state.paymentResponseReducer)

    useEffect(() => {

        return () => {
            log.info("[SuccessPayment] Component will unmount.")

            resetStates.forEach(resetState => {
                dispatch({
                    type: resetState
                })
            })

        }

        // eslint-disable-next-line
    }, [])

    log.info(`paymentResponse = ${JSON.stringify(paymentResponse)}`)
    if (paymentResponse.error) {
        // if user land on this page with an payment error
        // then we cannot proceed further...
        return <GenericErrorMsg />
    }

    if (!shippingAddressForm) {
        return <BadRequest />
    }

    if (!paymentResponse.hasOwnProperty("order_id")) {
        return null
    }

    // Helper to render section headers
    const SectionHeader = ({ icon, title }) => (
        <Grid container alignItems="center" spacing={1} style={{ marginBottom: '1rem', color: '#555' }}>
            <Grid item>{icon}</Grid>
            <Grid item>
                <Typography variant="h6" style={{ fontWeight: 600 }}>{title}</Typography>
            </Grid>
        </Grid>
    );

    const renderShoppingProducts = () => {
        if (!shoppingBagProducts.data) return null;

        return Object.entries(addToCart.productQty).map(([id, qty]) => {
            const product = shoppingBagProducts.data[id];
            return (
                <Grid key={id} container alignItems="center" style={{ padding: "1rem 0", borderBottom: '1px solid #eee' }}>
                    <Grid item xs={3} sm={2}>
                        <img src={product.imageURL} alt={product.name} style={{ width: '100%', maxWidth: 80, borderRadius: 4 }} />
                    </Grid>
                    <Grid item xs={9} sm={10} container direction="column">
                        <Typography variant="subtitle1" style={{ fontWeight: 'bold' }}>{product.name}</Typography>
                        <Typography variant="body2" color="textSecondary">{product.productBrandCategory.type}</Typography>
                        <Typography variant="body2" style={{ marginTop: 4 }}>
                            Qty: <b>{qty}</b> &nbsp;x&nbsp; ${product.price} = <b>${product.price * qty}</b>
                        </Typography>
                    </Grid>
                </Grid>
            );
        });
    };

    log.info('[SuccessPayment] Rendering SuccessPayment Component (Redesigned)')

    // Icons
    const SuccessIcon = () => <svg style={{ width: 60, height: 60, color: '#4caf50', marginBottom: 16 }} viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>;
    const ReceiptIcon = () => <svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24"><path fill="currentColor" d="M18 17H6v-2h12v2zm0-4H6v-2h12v2zm0-4H6V7h12v2zM3 22l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20z" /></svg>;
    const TruckIcon = () => <svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24"><path fill="currentColor" d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" /></svg>;
    const CardIcon = () => <svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24"><path fill="currentColor" d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" /></svg>;

    return (
        <Grid container justify="center" style={{ padding: "3rem 1rem", backgroundColor: "#f9f9f9", minHeight: '90vh' }}>
            <DocumentTitle title="Payment Success" />

            <Grid item xs={12} md={8} lg={6}>
                <Paper elevation={3} style={{ padding: "2rem 3rem", borderRadius: 12 }}>

                    {/* Header Section */}
                    <Grid container direction="column" alignItems="center" style={{ marginBottom: "2rem" }}>
                        <SuccessIcon />
                        <Typography variant="h4" style={{ fontWeight: 700, color: '#2e7d32', marginBottom: '0.5rem' }}>
                            Payment Successful!
                        </Typography>
                        <Typography variant="subtitle1" color="textSecondary" align="center">
                            Thank you for shopping at ZylkerKart. Your order has been placed.
                        </Typography>
                        <Grid item style={{ marginTop: '1rem', backgroundColor: '#e8f5e9', padding: '0.5rem 1.5rem', borderRadius: 20 }}>
                            <Typography variant="body1" style={{ color: '#2e7d32', fontWeight: 500 }}>
                                Order ID: #{paymentResponse.order_id}
                            </Typography>
                        </Grid>
                    </Grid>

                    <Divider style={{ marginBottom: "2rem" }} />

                    {/* Details Grid */}
                    <Grid container spacing={4}>

                        {/* Shipping Info */}
                        <Grid item xs={12} sm={6}>
                            <SectionHeader icon={<TruckIcon />} title="Delivery Information" />
                            <div style={{ paddingLeft: 4 }}>
                                <Typography variant="subtitle2" style={{ fontWeight: 'bold' }}>
                                    {shippingAddressForm.firstName} {shippingAddressForm.lastName}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {shippingAddressForm.addressLine1}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {shippingAddressForm.addressLine2}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {shippingAddressForm.city}, {shippingAddressForm.stateCode} {shippingAddressForm.zipCode}
                                </Typography>
                                <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
                                    Phone: {shippingAddressForm.phoneNumber}
                                </Typography>

                                <Grid container alignItems="center" style={{ marginTop: 12, color: '#e01a2b' }}>
                                    <Grid item>
                                        <Typography variant="caption" style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                                            {shippingOption.deliveryType}
                                        </Typography>
                                    </Grid>
                                </Grid>
                                <Typography variant="caption" color="textSecondary">
                                    Est. Delivery: {shippingOption.estimatedDate}
                                </Typography>
                            </div>
                        </Grid>

                        {/* Payment Info */}
                        <Grid item xs={12} sm={6}>
                            <SectionHeader icon={<CardIcon />} title="Payment Method" />
                            <div style={{ paddingLeft: 4 }}>
                                <Typography variant="body1" style={{ fontWeight: 500 }}>
                                    {paymentResponse.brand ? paymentResponse.brand.toUpperCase() : 'Card'} **** {paymentResponse.last4}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Expires: {paymentResponse.exp_month}/{paymentResponse.exp_year}
                                </Typography>
                                <Typography variant="h6" style={{ marginTop: 16, fontWeight: 700 }}>
                                    Total Paid: ${cartTotal + deliveryCharges}
                                </Typography>

                                <Button
                                    variant="outlined"
                                    color="primary"
                                    size="small"
                                    startIcon={<ReceiptIcon />}
                                    href={paymentResponse.receipt_url}
                                    target="_blank"
                                    style={{ marginTop: 12, textTransform: 'none' }}
                                >
                                    View Receipt
                                </Button>
                            </div>
                        </Grid>
                    </Grid>

                    <Divider style={{ margin: "2rem 0" }} />

                    {/* Order Summary */}
                    <SectionHeader icon={<svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24"><path fill="currentColor" d="M15.55 13c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.37-.66-.11-1.48-.87-1.48H5.21l-.94-2H1v2h2l3.6 7.59-1.35 2.44C4.52 15.37 5.48 17 7 17h12v-2H7l1.1-2h7.45zM6.16 6h12.15l-2.76 5H8.53L6.16 6zM7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" /></svg>} title="Order Summary" />

                    {renderShoppingProducts()}

                    {/* Footer Actions */}
                    <Grid container justify="center" style={{ marginTop: "3rem" }}>
                        <Button
                            component={Link}
                            to="/"
                            variant="contained"
                            style={{ backgroundColor: '#e01a2b', color: 'white', padding: '10px 40px', fontWeight: 'bold' }}
                        >
                            Continue Shopping
                        </Button>
                    </Grid>

                </Paper>
            </Grid>
        </Grid>
    )
}