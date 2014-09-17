var azure = require( 'azure' );
var crypt = require( '../common/crypt' );

var OrleansClientMetrics = "OrleansClientMetrics";
var OrleansClientStatistics = "OrleansClientStatistics";
var OrleansGrainState = "OrleansGrainState";
var OrleansSiloInstances = "OrleansSiloInstances";
var OrleansSiloMetrics = "OrleansSiloMetrics";
var OrleansSiloStatistics = "OrleansSiloStatistics";

module.exports = function ( accountName, accountKey ) {

    var tableClient = azure.createTableService( accountName, crypt.decrypt( accountKey ) );


    function queryEntities(query, cb) {
        tableClient.queryEntities(query, function(error, entities, continuationToken){
            if (error){
                console.log(error);
            }
            if (!error && continuationToken.nextPartitionKey) { 
                pageResults(entities, continuationToken, cb);
            } else {
                cb(error, entities);                    
            }
        });
    }

    function pageResults(entities, continuationToken, cb){
        continuationToken.getNextPage(function(error, results, newContinuationToken){
            entities = entities.concat(results);
            if (!error && newContinuationToken.nextPartitionKey){
                pageResults(entities, newContinuationToken, cb);
            } else {
                cb(error, entities);
            }
        });
    }

    function filterStatResults( values ) {
        if ( !values ) return [];
        return values.filter( function ( x ) {
            return x.Statistic.split( "." )[0] === "Grain";
        });
    }

    return {
        getClientMetrics: function ( deploymentId, cb ) {
            var query = azure.TableQuery.select().from( OrleansClientMetrics ).where( "PartitionKey eq ?", deploymentId );
            queryEntities( query, function ( err, results ) {
                results = mungeTableResults( results );
                cb( err, results );
            });
        },
        getClientStatistics: function ( deploymentId, cb ) {
            var query = azure.TableQuery.select().from( OrleansClientStatistics ).where( "PartitionKey eq ?", deploymentId );
            queryEntities( query, function ( err, results ) {
                results = mungeTableResults( results );
                cb( err, results );
            });
        },
        // this could also be the starting point?
        getSiloInstances: function ( deploymentId, cb ) {
            var query = azure.TableQuery.select().from( OrleansSiloInstances ).where( "Status eq ?", "Active" );
            queryEntities( query, function ( err, results ) {
                results = mungeTableResults( results );
                cb( err, results );
            });
        },
        // this could be the starting point
        getSiloMetrics: function ( cb ) {
            var query = azure.TableQuery.select().from( OrleansSiloMetrics );
            queryEntities( query, function ( err, results ) {
                results = mungeTableResults( results );
                cb( err, results );
            });
        },
        getSiloStatistics: function ( deploymentId, dateTime, cb ) {
            var date = new Date( dateTime );
            var query = azure.TableQuery.select().from( OrleansSiloStatistics )
                .where( "PartitionKey eq ?", deploymentId + ":" + formatDate( date ) );
                //.and( "Timestamp gt ?", date.toISOString() );
            queryEntities( query, function ( err, results ) {
                results = mungeTableResults( results );
                results = filterStatResults(results);
                results = fixStats(results);
                cb( err, results );
            });
        }
    };
}

function mungeTableResults( results ) {
    if ( !results ) results = [];
    results.forEach( function ( x ) { delete x._; });
    return results;
}

function formatDate( date ) {
    return date.getFullYear() + "-" + pad( date.getMonth() + 1 ) + "-" + pad( date.getDate() );
}

function pad( value ) {
    if ( value < 10 ) return "0" + value.toString();
    else return value.toString();
}


function fixStats(rawdata){
    var metrics = {};
    var hostnames = {};
    if (rawdata.length === 0) return {metrics : metrics, hostnames:hostnames};

    rawdata.forEach(function(x){
        var key =  x.Name;
        if (!metrics[key]){
            hostnames[x.Name] = x.HostName;
            metrics[key] = {
                HostName: x.HostName,
                Name: x.Name,
                Statistic: x.Statistic,
                values:[]
            };
        }
        metrics[key].values.push(x);
        x.Time = Date.parse(x.Timestamp);//(time - time % (5 * 60 * 1000));
    });

    for (var key in metrics){
        var metric = metrics[key];
        if (metric.values.length <= 1){
            delete metrics[key];
            continue;
        }
        metric.values = metric.values.sort(function (a, b) {return a.Time - b.Time;});
       
        if (metric.values.length > 20){
            metric.values = metric.values.splice(metric.values.length -20, 20);
        }

        // go back and work out time slots
        metric.name = key.replace("Grain.", "");
        metric.count = metric.values.length;
        metric.currentValue = metric.values[metric.values.length -1];
    }
    return {metrics : metrics, hostnames:hostnames};
}