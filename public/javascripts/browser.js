$(document).ready(function(){
    var connectionDetails = {};
    var templates = {};
    
    templates.home = Handlebars.compile($("#main").html());

    var render = function(templateId, data, target){
        var template;
        if (templates[templateId]){
            template = templates[templateId];
        } else {
            template = Handlebars.compile($("#" + templateId).html())
            templates[templateId] = template;
        }
        var html = template(data);
        if (!target){
            target = "main"
        }
        $("#" + target).html(html);
    }

    var loading = function(){
        render("loading-template", {});
    }

    var reload = function(){

    }

    function handleError(data, callback){
        if (data && data.error && data.error === "NotAuthenticated"){
            appRouter.navigate("#/", {trigger: true, replace: true});
        } else {
            callback(data);
        }
    }

    function get(path, callback){
        $.ajax(path, {
            cache:false,
            success : function(data){handleError(data, callback)},
            error: function(_,_,reason){
                handleError({error:reason}, callback);
            }
        }); 
    }

    function post(path, data, callback){
        $.ajax(path, {
            cache:false,
            success : function(data){handleError(data, callback)},
            data: data,
            type: "POST",
            error: function(_,_,reason){
                handleError({error:reason}, callback);
            }
        }); 
    }

    function del(path, callback){
        $.ajax(path, {
            cache:false,
            success : function(data){handleError(data, callback)},
            type: "DELETE",
            error: function(_,_,reason){
                handleError({error:reason}, callback);
            }
        }); 
    }

    function updateMenu(value){
        $(".menu").removeClass("menuActive");
        $("#" + value + "-menu").addClass("menuActive");    
    }

    var AppRouter = Backbone.Router.extend({
        routes: { 
            "": "home",
            "addStorageAccount" : "addStorageAccount",
            "cancelStorageAccount" : "cancelStorageAccount", 
            "storageAccounts" : "storageAccounts",
            "deleteStorageAccount/:accountName" : "deleteStorageAccount",
            "farm" : "farm",
            "stats/:account/:deploymenId": "stats"
        },
        home : function(){
            refresh = function(){};
            updateMenu("home");
            render("home");   
        },
        addStorageAccount:function(){
            refresh = function(){};
            $("#storageAccount").val("");
            $("#storageKey").val("");
            $('#addStorageAccountModal').modal({backdrop:"static", keyboard:false});
        },
        cancelStorageAccount:function(){
            refresh = function(){};
            $('#addStorageAccountModal').modal('hide');
            appRouter.navigate("#/storageAccounts", {trigger: false, replace: true});
        },
        storageAccounts: function(){
            refresh = function(){};
            updateMenu("storageAccounts");
            loading();
            get("/account", function(data){
                if (!data || data.length === 0){
                    return render("siloMetricsEmpty-template");
                }                    

                render("listAccounts-template",{account:data});                    
            })
        },
        deleteStorageAccount : function(accountName){
            refresh = function(){};
            loading();
            del("/account/" + accountName, function(data){
                render("listAccounts-template",{account:data});                    
            })
        },
        farm:function(){
            refresh = function(){};
            updateMenu("farm");
            loading();
            refresh = function(){
                get("/OrleansSiloMetrics/", function(dataObj){

                    if (Object.keys(dataObj).length === 0){
                        appRouter.navigate("#/storageAccounts", {trigger: true, replace: true});
                        return;    
                    }


                    var data = [];
                    for (var x in dataObj){
                        for (var i = 0; i < dataObj[x].length; i++){
                            dataObj[x][i].account = x;
                        }
                        data = data.concat(dataObj[x]);
                    }
                    if (!data.length){
                        render("siloMetric-noData-template");
                        return;
                    }

                    var dictionary = {};
                    var farms = [];
                    data.forEach(function(silo){
                        var farmName = silo.RowKey.split(".")[0];
                        dictionary[silo.PartitionKey] = {silos:[], name:farmName, deploymentId: silo.PartitionKey, account:silo.account};
                    });
                    data.forEach(function(silo){
                        silo.Health = "green";
                        if (parseInt(silo.CPU) > 70) silo.Health = "orange";
                        if (parseInt(silo.CPU) > 90) silo.Health = "red";
                        dictionary[silo.PartitionKey].silos.push(silo);
                    });
                    for (var key in dictionary){
                        farms.push(dictionary[key]);
                    }

                    render("siloMetrics-template",{farms:farms});   
                });
            }  
            refresh();
        },
        stats:function(account, deploymentId){
            refresh = function(){};
            updateMenu("");
            loading();
            refresh = function(){
                get("/OrleansSiloStatistics/" + account + "/" + deploymentId, function(rawdata){
                    
                    var metrics = rawdata.metrics;
                    var hostnames = rawdata.hostnames
                    
                    if (!rawdata || !rawdata.hostnames || Object.keys(rawdata.hostnames).length === 0){
                        render("noData-template");   
                        return;
                    }

                    render("siloStatistics-template", {name:deploymentId, stats: Object.keys(hostnames).map(function(x){return {id:x.replace(/[.]/g, "_"),name:x}})});

                    var toNumber = function(x){return Number(x.StatValue)};

                    for (var name in hostnames){
                        var hostname = hostnames[name];
                        var stats = [];
                        for (var key in metrics){
                            var metric = metrics[key];
                            if (metric.Name === name){
                                var data = metric.values;
                                stats.push({
                                    type: 'line',
                                    name: metric.Statistic,
                                    pointInterval: (data[data.length - 1].Time - data[0].Time) /  data.length,
                                    pointStart: data[0].Time,
                                    data: data.map(toNumber)
                                });
                            }
                        }

                        $("#" + name.replace(/[.]/g, "_")).highcharts({
                            chart: { type: 'column' },
                            title: { text: '' },
                            xAxis: { type: 'datetime' },
                            yAxis: { title: { text: '' }, min: 0 },
                            legend: { enabled: false },

                            plotOptions: {
                                area: {
                                    stacking: 'normal',
                                    dataLabels: {
                                        enabled: true
                                    }
                                }
                            },
        
                            series: stats
                        });
                    }
                });
            }
            refresh();
        }
    });

    // event handlers
    function addAccountPressed(){
        var obj = {
            accountName : $("#storageAccount").val(),
            accountKey : $("#storageKey").val()
        }
        $('#addStorageAccountModal').modal('hide');
        post("/account", obj, function(){
            appRouter.navigate("#/farm", {trigger: true, replace: true});
        });
    }

    // bind events
    $("#addAccount").click(addAccountPressed);

    var appRouter = new AppRouter();
    Backbone.history.start();

    get("/ping", function(result){
        if (result.ok === true){
            $("#nav").show();
            $("#refresh").click(function(){ refresh(); });
            $("#name").text(result.displayName.toUpperCase());
            appRouter.navigate("#/farm", {trigger: true, replace: true});
            setInterval(function(){ refresh() }, 60 * 1000);
        }
    });
    
});