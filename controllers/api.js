var orleansTableStorage = require( '../common/orleansTableStorage' );
var humanize = require( 'humanize' );
var crypt = require( '../common/crypt' );

module.exports = function ( app, auth ) {

    app.get( "/OrleansSiloMetrics", auth, function ( req, res ) {

        // no accounts
        if ( Object.keys( req.user.accounts ).length === 0 ) {
            res.json( {});
            return;
        }

        var counter = 0;
        var result = {};

        var cb = function ( err, accountName, data ) {
            counter -= 1;
            result[accountName] = data;
            if ( counter === 0 ) {
                res.json( result );
            }
        }

    Object.keys( req.user.accounts ).forEach( function ( accountName ) {
            counter += 1;
            try {
                getMetricsForAccount( accountName, req.user.accounts[accountName], function ( err, data ) {
                    cb( err, accountName, data );
                });
            } catch ( err ) {
                cb( err, accountName, [] );
            }
        });
    });


    app.get( "/OrleansSiloStatistics/:account/:deploymentId/:time?", auth, function ( req, res ) {
        if ( !req.user.accounts[req.params.account] ) {
            res.json( { error: "no permission to account" });
            return;
        }

        if ( !req.params.time ) {
            var time = new Date().getTime() - (1000 * 60 * 60);
        } else {
            var time = req.params.time;
        }

        var storage = orleansTableStorage( req.params.account, req.user.accounts[req.params.account] );
        storage.getSiloStatistics( req.params.deploymentId, time, function ( err, data ) {
            res.json( data );
        });
    });

};

function getMetricsForAccount( accountName, accountKey, cb ) {
    var storage = orleansTableStorage( accountName, accountKey );
    storage.getSiloMetrics( function ( err, data ) {
        format( data, "Memory", humanize.filesize );
        format( data, "CPU", significantDigits );
        data.forEach( function ( x ) {
            var age = ( new Date().getTime() - new Date( x.Timestamp ).getTime() );
            if ( age > 30 * 1000 * 3 ) {
                x.Dead = true;
            }
        });
        data = data.filter( function ( x ) {return !x.Dead });
        cb( err, data );
    });
}


function format( records, field, formatter ) {
    if ( !records || records.length === 0 ) return;

    records.forEach( function ( x ) {
        x[field + "_formatted"] = formatter( x[field] );
    });
}

function significantDigits( number ) {
    if ( number === null || number === undefined ) return number
    return number.toFixed( 1 );
}

