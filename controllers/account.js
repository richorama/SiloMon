var accountStorage = require( '../common/accountTableStorage' );
var crypt = require( '../common/crypt' );

module.exports = function ( app, auth ) {

    app.get( "/account", auth, function ( req, res ) {
        res.json( Object.keys( req.user.accounts ) );
    });

    app.post( "/account", auth, function ( req, res ) {
        if ( req.body === null ) {
            res.json( { error: "no body" });
        }
        var encryptedKey = crypt.encrypt( req.body.accountKey );
        accountStorage.addSubscription( req.user.profile.id, req.body.accountName, encryptedKey, function ( err ) {
            req.user.accounts[req.body.accountName] = encryptedKey;
            res.json( { ok: true });
        });
    });

    app.delete( "/account/:account", auth, function ( req, res ) {
        if ( !req.user.accounts[req.params.account] ) {
            res.json( { error: "no permission to account" });
            return;
        }
        delete req.user.accounts[req.params.account];
        accountStorage.deleteSubscription( req.user.profile.id, req.params.account, function ( err ) {
            res.json( Object.keys( req.user.accounts ) );
        });
    });


};

