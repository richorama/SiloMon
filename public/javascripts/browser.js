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
                    
                    if (!rawdata || rawdata.length === 0){
                        render("noData-template");   
                        return;
                    }

                    var metrics = {};
                    var hostnames = {};
                    rawdata.forEach(function(x){
                        metrics[x.Statistic] = (metrics[x.Statistic] || 0) + 1;
                        hostnames[x.Name] = true;
                    });

                    console.log(metrics);
                    console.log(hostnames);

                    hostnames = Object.keys(hostnames).sort();

                    var metricTotals = Object.keys(metrics).sort().map(function(x){
                        return {name:x, count:metrics[x]}
                    })
                    render("siloStatistics-template", {name:deploymentId, metrics: metricTotals});

                    $(".series-checkbox").change(function(e){
                        console.log(e.target.id, e.target.checked);

                        var colors = {};

                        if (e.target.checked){
                            hostnames.forEach(function(host){
                                var data = rawdata.filter(function(x){
                                    return x.Statistic === e.target.id && x.Name === host;
                                });

                                if (!data.length) return;
                                console.log(data.map(function(x){return Number(x.StatValue);}));

                                var series =  {
                                    ref : e.target.id,
                                    type: 'line',
                                    name: e.target.id + " - " + host,
                                    pointInterval: (new Date(data[data.length - 1].Timestamp).getTime() - new Date(data[0].Timestamp).getTime()) /  data.length,
                                    pointStart: new Date(data[0].Timestamp).getTime(),
                                    data: data.map(function(x){return Number(x.StatValue);})
                                }
                                var x= $(chart).highcharts().addSeries(series);
                                colors[host] = x.color;
                            });
                           
                            var text = Object.keys(colors).map(function(hostKey){
                                return '<span style="color:' + colors[hostKey] +'">' + hostKey + "</span>"
                            }).join(" ")

                            $("#legend-" + e.target.id.replace(/\./g, "\\.")).html("<small><strong>" + text + "</strong></small>");

                            return;
                        } 

                        // remove series
                        var removeList = $(chart).highcharts().series.filter(function(x){
                            return x.name.split(" - ")[0] === e.target.id;
                        });
                        removeList.forEach(function(x){
                            x.remove();
                        });
                        $("#legend-" + e.target.id.replace(/\./g, "\\.")).html("");


                    });

                    var chart = $("#chart").highcharts({
                        chart: { type: 'column' },
                        title: { text: '' },
                        xAxis: { type: 'datetime' },
                        yAxis: { title: { text: '' }, min: 0 },
                        legend: false,
                        plotOptions: {
                            area: {
                                stacking: 'normal',
                                dataLabels: {
                                    enabled: true
                                }
                            }
                        }
                    });
                  
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