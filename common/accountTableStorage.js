var azure = require('azure');
var crypto = require('crypto');

var SubscriptionTable = "usersubscription";
var UserLog = "userlog";

var tableClient = azure.createTableService(process.env.STORAGE_NAME, process.env.STORAGE_KEY;

tableClient.createTable(SubscriptionTable, console.log);
tableClient.createTable(UserLog, console.log);

module.exports.queryUser = function(userId, cb){
    var query = azure.TableQuery.select().from(SubscriptionTable).where("PartitionKey eq ?", sha(userId));
    tableClient.queryEntities(query, function(err, results){
        if (!results) results = [];
        var accounts = {};
        results.forEach(function(x){
            accounts[x.RowKey] = x.accountKey
        });
        cb(err, accounts);
    });    
}

module.exports.addSubscription = function(userId, accountName, accountKey, cb){
    var entity = {
        PartitionKey : sha(userId),
        RowKey : accountName,
        accountKey: accountKey    
    }
    tableClient.insertOrReplaceEntity(SubscriptionTable, entity, function(err){
        if (err) console.log(err);
        cb(err);
    });    
}

module.exports.deleteSubscription = function(userId, accountName, cb){
    var entity = {
        PartitionKey : sha(userId),
        RowKey : accountName,
        ETag : "*"
    }
    tableClient.deleteEntity(SubscriptionTable, entity, function(err){
        if (err) console.log(err);
        cb(err);
    });
}

module.exports.logUserAccess = function(userid, name){
    var entity = {
        PartitionKey: sha(userid),
        RowKey: new Date().getTime().toString(),
        userid: userid,
        name: name
    }
    tableClient.insertOrReplaceEntity(UserLog, entity, function(err){
        if (err) console.log(err);
    });
}

function sha(data){
    return crypto.createHash('sha1').update(data).digest("hex");
}        
