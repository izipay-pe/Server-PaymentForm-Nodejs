<p align="center">
  <img src="https://github.com/izipay-pe/Imagenes/blob/main/logos_izipay/logo-izipay-banner-1140x100.png?raw=true" alt="Formulario" width=100%/>
</p>

# Server-PaymentForm-NodeJS

## Índice

➡️ [1. Introducción](#-1-introducci%C3%B3n)  
🔑 [2. Requisitos previos](#-2-requisitos-previos)  
🚀 [3. Ejecutar ejemplo](#-3-ejecutar-ejemplo)  
🔗 [4. APIs](#4-APIs)  
💻 [4.1. FormToken](#41-formtoken)  
💳 [4.2. Validación de firma](#42-validaci%C3%B3n-de-firma)  
📡 [4.3. IPN](#43-ipn)  
📮 [5. Probar desde POSTMAN](#-5-probar-desde-postman)  
📚 [6. Consideraciones](#-6-consideraciones)

## ➡️ 1. Introducción

En este manual podrás encontrar una guía paso a paso para configurar un servidor API REST (Backend) en **[NodeJS]** para la pasarela de pagos de IZIPAY. **El actual proyecto no incluye una interfaz de usuario (Frontend)** y debe integrarse con un proyecto frontend. Te proporcionaremos instrucciones detalladas y credenciales de prueba para la instalación y configuración del proyecto, permitiéndote trabajar y experimentar de manera segura en tu propio entorno local.
Este manual está diseñado para ayudarte a comprender el flujo de la integración de la pasarela para ayudarte a aprovechar al máximo tu proyecto y facilitar tu experiencia de desarrollo.

<p align="center">
  <img src="https://i.postimg.cc/KYpyqYPn/imagen-2025-01-28-082121144.png" alt="Formulario"/>
</p>

## 🔑 2. Requisitos Previos

- Comprender el flujo de comunicación de la pasarela. [Información Aquí](https://secure.micuentaweb.pe/doc/es-PE/rest/V4.0/javascript/guide/start.html)
- Extraer credenciales del Back Office Vendedor. [Guía Aquí](https://github.com/izipay-pe/obtener-credenciales-de-conexion)
- Para este proyecto se utiliza NodeJS v22.12.0.
- Para este proyecto utilizamos la herramienta Visual Studio Code.
> [!NOTE]
> Tener en cuenta que, para que el desarrollo de tu proyecto, eres libre de emplear tus herramientas preferidas.

## 🚀 3. Ejecutar ejemplo


### Clonar el proyecto
```sh
git clone https://github.com/izipay-pe/Server-PaymentForm-NodeJS.git
``` 

### Datos de conexión 

Reemplace **[CHANGE_ME]** con sus credenciales de `API REST` extraídas desde el Back Office Vendedor, revisar [Requisitos previos](#-2-requisitos-previos).

- Editar el archivo `keys/keys.js` en la ruta raiz del proyecto:
```node
const keys = {
    // Identificador de la tienda
    "USERNAME" : "~ CHANGE_ME_USER_ID ~",

    // Clave de Test o Producción
    "PASSWORD" : "~ CHANGE_ME_PASSWORD ~",

    // Clave Pública de Test o Producción
    "PUBLIC_KEY" : "~ CHANGE_ME_PUBLIC_KEY ~", 
    
    // Clave HMAC-SHA-256 de Test o Producción
    "HMACSHA256": "~ CHANGE_ME_HMAC_SHA_256 ~",
}

module.exports = keys
```

### Ejecutar proyecto

1. Ejecuta el siguiente comando para instalar todas las dependencias necesarias:
```bash
npm install
```

2.  Iniciar la aplicación:
```bash
npm start
```

## 🔗4. APIs
- 💻 **FormToken:** Generación de formToken y envío de la llave publicKey necesarios para desplegar la pasarela.
- 💳  **Validacion de firma:** Se encarga de verificar la autenticidad de los datos.
- 📩 ️ **IPN:** Comunicación de servidor a servidor. Envío de los datos del pago al servidor.

## 💻4.1. FormToken
Para configurar la pasarela se necesita generar un formtoken. Se realizará una solicitud API REST a la api de creación de pagos:  `https://api.micuentaweb.pe/api-payment/V4/Charge/CreatePayment` con los datos de la compra para generar el formtoken. El servidor devuelve el formToken generado junto a la llave `publicKey` necesaria para desplegar la pasarela

Podrás encontrarlo en el archivo `controllers/paidController.js`.

```node
controller.formtoken = async (req, res) => {
    const { amount, currency, orderId, email, firstName, lastName, phoneNumber, identityType, identityCode, address, country, city, state, zipCode } = req.body;

  url = 'https://api.micuentaweb.pe/api-payment/V4/Charge/CreatePayment';
  
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
            ..
            ..
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

```
Podrás acceder a esta API a través:
```bash
localhost:3000/formToken
```
ℹ️ Para más información: [Formtoken](https://secure.micuentaweb.pe/doc/es-PE/rest/V4.0/javascript/guide/embedded/formToken.html)

## 💳4.2. Validación de firma
Se configura la función `checkHash` que realizará la validación de los datos recibidos por el servidor luego de realizar el pago mediante el parámetro `kr-answer` utilizando una clave de encriptación definida en `key`. Podrás encontrarlo en el archivo `controllers/paidController.js`.

```node
const checkHash = (response, key) => {
    const answer = response['kr-answer'];

    const calculateHash = Hex.stringify(hmacSHA256(answer, key))

    return calculateHash == response["kr-hash"];
}
```

Se valida que la firma recibida es correcta. Para la validación de los datos recibidos a través de la pasarela de pagos (front) se utiliza la clave `HMACSHA256`.

```node
controller.apiValidate = (req, res) => {
  if (Object.keys(req.body).length === 0){
    throw new Error('No post data received!');
  }

  // Validación de firma
  const validate = checkHash(req.body, HMACSHA256)
  res.status(200).send(validate);
}
```
El servidor devuelve un valor booleano `true` o `false` verificando si los datos de la transacción coinciden con la firma recibida. Se confirma que los datos son enviados desde el servidor de Izipay.

Podrás acceder a esta API a través:
```bash
localhost:3000/validate
```

ℹ️ Para más información: [Analizar resultado del pago](https://secure.micuentaweb.pe/doc/es-PE/rest/V4.0/kb/payment_done.html)

## 📩4.3. IPN
La IPN es una notificación de servidor a servidor (servidor de Izipay hacia el servidor del comercio) que facilita información en tiempo real y de manera automática cuando se produce un evento, por ejemplo, al registrar una transacción.

Se realiza la verificación de la firma utilizando la función `checkHash`. Para la validación de los datos recibidos a través de la IPN (back) se utiliza la clave `PASSWORD`. Se devuelve al servidor de izipay un mensaje confirmando el estado del pago.

Se recomienda verificar el parámetro `orderStatus` para determinar si su valor es `PAID` o `UNPAID`. De esta manera verificar si el pago se ha realizado con éxito.

Podrás encontrarlo en el archivo `controllers/paidController.js`.

```node
controller.ipn = (req, res) => {
    if (Object.keys(req.body).length === 0){
        throw new Error('No post data received!');
    }

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
```
Podrás acceder a esta API a través:
```bash
localhost:3000/ipn
```

La ruta o enlace de la IPN debe ir configurada en el Backoffice Vendedor, en `Configuración -> Reglas de notificación -> URL de notificación al final del pago`

<p align="center">
  <img src="https://i.postimg.cc/XNGt9tyt/ipn.png" alt="Formulario" width=80%/>
</p>

ℹ️ Para más información: [Analizar IPN](https://secure.micuentaweb.pe/doc/es-PE/rest/V4.0/api/kb/ipn_usage.html)

## 📡4.3.Pase a producción

Reemplace **[CHANGE_ME]** con sus credenciales de PRODUCCIÓN de `API REST` extraídas desde el Back Office Vendedor, revisar [Requisitos Previos](#-2-requisitos-previos).

- Editar el archivo `keys/keys.js` en la ruta raiz del proyecto:
```node
const keys = {
    // Identificador de la tienda
    "USERNAME" : "~ CHANGE_ME_USER_ID ~",

    // Clave de Test o Producción
    "PASSWORD" : "~ CHANGE_ME_PASSWORD ~",

    // Clave Pública de Test o Producción
    "PUBLIC_KEY" : "~ CHANGE_ME_PUBLIC_KEY ~", 
    
    // Clave HMAC-SHA-256 de Test o Producción
    "HMACSHA256": "~ CHANGE_ME_HMAC_SHA_256 ~",
}

module.exports = keys
```

## 📮 5. Probar desde POSTMAN
* Puedes probar la generación del formToken desde POSTMAN. Coloca la URL con el metodo POST con la ruta `/formToken`.
  
 ```bash
localhost:3000/formToken
```

* Datos a enviar en formato JSON raw:
 ```node
{
    "amount": 1000,
    "currency": "PEN", //USD
    "orderId": "ORDER12345",
    "email": "cliente@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phoneNumber": "123456789",
    "identityType": "DNI",
    "identityCode": "ABC123456",
    "address": "Calle principal 123",
    "country": "PE",
    "city": "Lima",
    "state": "Lima",
    "zipCode": "10001"
}
```

## 📚 6. Consideraciones

Para obtener más información, echa un vistazo a:

- [Formulario incrustado: prueba rápida](https://secure.micuentaweb.pe/doc/es-PE/rest/V4.0/javascript/quick_start_js.html)
- [Primeros pasos: pago simple](https://secure.micuentaweb.pe/doc/es-PE/rest/V4.0/javascript/guide/start.html)
- [Servicios web - referencia de la API REST](https://secure.micuentaweb.pe/doc/es-PE/rest/V4.0/api/reference.html)
