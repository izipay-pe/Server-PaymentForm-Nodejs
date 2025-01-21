const express = require ('express');
const util = require('util');
const axios = require('axios');
const keys = require("../keys/keys");
const Hex = require('crypto-js/enc-hex');
const crypto = require('crypto');
const hmacSHA256 = require('crypto-js/hmac-sha256');
const { createHmac } = require('crypto');
const controller = {};

const username = keys.USERNAME;
const password = keys.PASSWORD;
const publicKey = keys.PUBLIC_KEY;
const HMACSHA256 = keys.HMACSHA256; 

controller.home = (req, res) => {
    res.send('Servidor Node.js - Mi Cuenta Web en funcionamiento sin frontend');
}

controller.formToken = async (req, res) => {
  
  const { amount, currency, orderId, email, firstName, lastName, phoneNumber, identityType, identityCode, address, country, city, state, zipCode } = req.body;

  // URL de Web Service REST
  url = 'https://api.micuentaweb.pe/api-payment/V4/Charge/CreatePayment';
  
  // Encabezado Basic con concatenación de "usuario:contraseña" en base64
  const auth = 'Basic ' + btoa(username + ':' + password);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': auth,
  };

  const data = {
    "amount":   amount*100,
    "currency": currency,
    "orderId":  orderId,
    "customer": {
        "email": email,
        "billingDetails": {
            "firstName": firstName,
            "lastName": lastName,
            "phoneNumber": phoneNumber,
            "identityType": identityType,
            "identityCode": identityCode,
            "address": address,
            "country": country,
            "city": city,
            "state": state,
            "zipCode": zipCode
        }
    }
  };

  const response = await axios.post(url, data, {
    headers: headers,
  });

  if (response.data.status == 'SUCCESS'){
    // Obtenemos el formtoken generado  
    const formToken = response.data.answer.formToken;
    res.send({formToken , publicKey})
  }else{
    console.error(response.data);
    res.status(500).send('error');
  }
}

controller.apiValidate = (req, res) => {
  if (Object.keys(req.body).length === 0){
    throw new Error('No post data received!');
  }

  // Validación de firma
  const validate = checkHash(req.body, HMACSHA256)
  res.status(200).send(validate);
}

controller.ipn = (req, res) => {
  if (Object.keys(req.body).length === 0){
    throw new Error('No post data received!');
  }

  // Validación de firma en IPN
  if (!checkHash(req.body, password)){
    throw new Error('Invalid signature');
  }

  const answer = JSON.parse(req.body['kr-answer']);
  const transaction = answer['transactions'][0];

  //Verificar orderStatus: PAID / UNPAID
  const orderStatus = answer['orderStatus'];
  const orderId = answer['orderDetails']['orderId'];
  const transactionUuid = transaction['uuid'];

  res.status(200).send(`OK! OrderStatus is ${orderStatus}`);
}

const checkHash = (response, key) => {
  const answer = response['kr-answer'];

  const calculateHash = Hex.stringify(hmacSHA256(answer, key))

  return calculateHash == response["kr-hash"];
}

module.exports = controller;