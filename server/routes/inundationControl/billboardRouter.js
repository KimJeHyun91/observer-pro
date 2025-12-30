const billboardController = require('./controllers/billboardController');

router.post('/greenparking/message', billboardController.sendGreenParkingBillboardMessage); 