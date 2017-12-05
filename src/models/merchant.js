const mongoose = require('mongoose');

const MerchantSchema = mongoose.Schema({
	name: {type : String, unique : true, required : true},
  incomingWebHookURL: {type : String, required : true},
});

const Merchant = mongoose.model('Merchant', MerchantSchema)

module.exports = { Merchant };
