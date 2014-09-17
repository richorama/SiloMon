var crypto = require( 'crypto' );
var assert = require( 'assert' );

var algorithm = 'aes256'; // or any other algorithm supported by OpenSSL
var key = process.env.CRYPTO_KEY;

module.exports.encrypt = function ( text ) {
    var cipher = crypto.createCipher( algorithm, key );
    var encrypted = cipher.update( text, 'utf8', 'hex' ) + cipher.final( 'hex' );
    return encrypted;
}

module.exports.decrypt = function ( encrypted ) {
    var decipher = crypto.createDecipher( algorithm, key );
    var decrypted = decipher.update( encrypted, 'hex', 'utf8' ) + decipher.final( 'utf8' );
    return decrypted;
}