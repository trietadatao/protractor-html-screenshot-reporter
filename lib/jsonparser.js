var _ = require('underscore'),
    path = require('path'), 
    reporterOptions;

//create a namespace for these functions, so they do not conflict with other scripts
var phssr = phssr ? phssr : {};

var reportInfo = {};

phssr.makeScriptTag = function(){
    var scrpTag = "<script type='text/javascript'>";
    scrpTag +="function showTrace(e){";
    scrpTag +="window.event.srcElement.parentElement.getElementsByClassName('traceinfo')[0].className = 'traceinfo visible';}";
    scrpTag +="function closeTraceModal(e){";
    scrpTag +="window.event.srcElement.parentElement.parentElement.className = 'traceinfo';}";
    scrpTag +="function openModal(imageSource){";
    scrpTag +="var myWindow = window.open('','screenshotWindow');";
    scrpTag +="myWindow.document.write('<img class=\"screenshot\" src=\"' +imageSource + '\" alt=\"screenshot\" />');}";
    scrpTag +="\nfunction toggleSibling(el){";
    scrpTag +="\nvar a;";
    scrpTag +="\nif (el.text == 'Show details') {a = '';el.text = 'Hide details';}";
    scrpTag +="\nelse {a = 'none'; el.text = 'Show details';}";
    scrpTag +="\nfor (var i = 0; i < el.parentNode.childNodes.length; i++) {";
    scrpTag +="\nif (el.parentNode.childNodes[i] != el)";
    scrpTag +="\nel.parentNode.childNodes[i].style.display = a;}};";
    scrpTag += "</script>";
    scrpTag += "\n<script src='https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js'></script>"
    return scrpTag;
};

phssr.makeHardCodedStyleTag = function(reporterOptions){
    var styleTag = "<style>";
    styleTag+= "body{font-family:Arial};";
    styleTag+= "ul,li{margin-left:0;padding-left:0;width:100%;font-weight:bold;}";
    styleTag+= "table{width:95%;text-align:left;border-spacing:0;border-collapse: separate;margin-bottom:5px;}";
    styleTag+= "li{font-weight:bold;padding-left:5px;list-style:none;}";
    styleTag+= "ul table li{font-weight: normal}";
    styleTag+= "th,td{padding: 10px;border: 1px solid #000;}";
    styleTag+= ".desc-col{min-width:150px;font-weight: bold;}";
    styleTag+= "td.status-col{width:75px;}th.status-col{width: 75px;}";
    styleTag+= ".env-col{min-width:200px;font-size:small;}";
    styleTag+= ".time-col{min-width:130px;}";
    styleTag+= "td.msg-col{width:135px;}th.msg-col{width: 135px;}";
    styleTag+= "tr.header{background-color: gray; color: #fff;margin-left:20px; align}";
    styleTag+= ".traceinfo{position: fixed;top: 0; bottom: 0;left: 0;right:0;background: rgba(0,0,0,0.8);z-index: 99999;opacity:0;-webkit-transition: opacity 400ms ease-in;transition: opacity 400ms ease-in;pointer-events: none;}";
    styleTag+= ".traceinfo.visible{opacity:1;pointer-events: auto;}";
    styleTag+= ".traceinfo > div{width: 400px;position: relative;margin: 10% auto;padding: 5px 20px 13px 20px;background: #fff;}";
    styleTag+= ".traceinfo .close{background: #606061;color: #FFFFFF;line-height: 25px;position: absolute;right: -12px;text-align: center;top: -10px;width: 24px;text-decoration: none;font-weight: bold;}";
    styleTag+= ".traceinfo .close:hover{background: #00d9ff;}";
	styleTag+= ".msg-col{width:70% !important;}";
	styleTag+= "ul{padding:0}";
	styleTag+= "img.screenshot{width:100%}";
    styleTag+= ".clickable{color: auto;} .clickable:hover{color: red;}";
    styleTag+= ".linkable{color: auto;} .linkable:hover{color: blue;}";
    styleTag+= "</style>";

    //Can override all styles with a CSS file
    if(reporterOptions.cssOverrideFile){
         styleTag = '<link href="' + reporterOptions.cssOverrideFile + '" rel="stylesheet" type="text/css"/>';
    }

    return styleTag;
}

phssr.makeHTMLPage = function(tableHtml, reporterOptions){
    var styleTag = phssr.makeHardCodedStyleTag(reporterOptions);
    var scrpTag = phssr.makeScriptTag();

    var staticHTMLContentprefix = "<html><head><meta charset='utf-8'/>";

    //Add title if it was in config setup
    if (typeof (reporterOptions.docTitle) !== 'undefined' && _.isString(reporterOptions.docTitle) ){
        staticHTMLContentprefix += "<title>" + reporterOptions.docTitle + "</title>";
    } else {
        staticHTMLContentprefix += "<title></title>";
    }

    staticHTMLContentprefix +=  styleTag + scrpTag + " </head><body>";
    staticHTMLContentprefix +=  "<h1 align='center'>Test Result on " + baseUrl +"</h1>" + buildSummaryReport();
    staticHTMLContentprefix +=  "<h2 class='clickable' align='center' onclick='javascript:(function(){\n$(\"a[onclick*=toggle]\").click()\n})()'>Detail Report</h2>";
    staticHTMLContentprefix +=  "<table><tr class='header' align='center'><th class='desc-col'>Description</th><th class='status-col'>Passed</th>";
    staticHTMLContentprefix +=  "<th class='env-col'>Env Info</th>";
    //staticHTMLContentprefix +=  "<th class='time-col'>Time</th>";
    staticHTMLContentprefix +=  "<th class='msg-col'>Message</th>";
    staticHTMLContentprefix +=  "<th class='img-col'>Screenshot</th></tr>";

    var staticHTMLContentpostfix = "</table></body></html>";
    var htmlComplete = staticHTMLContentprefix + tableHtml + staticHTMLContentpostfix;

    return htmlComplete;
}


function generateHTML(data){
    var str = '<tr>';
    str += '<td class="desc-col">' + data.desc + '</td>';
    var bgColor = data.passed? 'green': 'red';
    str += '<td class="status-col" style="color:#fff;background-color: '+ bgColor+'">' + data.passed + '</td>';
    str += '<td class="env-col">' + 'OS: ' + data.os + '<br/>';
    str += 'Browser: <span style="font-size:10">' + data.browser.name + ' ' + data.browser.version + '</span>';

    if (data.startTime && data.endTime) {
        str += '<br/>Start time: <span style="font-size:10">' + new Date(data.startTime).toISOString() + '</span>';
        str += '<br/>End time: <span style="font-size:10">' + new Date(data.endTime).toISOString() + '</span>';
        str += '<br/>Total time: ' + (Math.round((data.endTime - data.startTime) / 100) / 10).toString() + 's';
    }
    str += '</td>';

    var stackTraceInfo = data.passed? '': '<br/>' + data.message;

    str +=  '<td class="msg-col">' + '<a href="javascript:void(0)" onclick="toggleSibling(this)">Show details</a><div class="togg" style="display: none;">' + data.message + '</div></td>';

    if(!(reporterOptions.takeScreenShotsOnlyForFailedSpecs && data.passed)) {
        str +=  '<td class="img-col"><a target="_blank" href=\"' + path.basename(data.screenShotFile)+ '\")>View</a></td>';
    }
    else{
        str +=  '<td class="img-col"></td>';   
    }
    
    str += '</tr>';
    return str;

}

function findDeep(items, attrs) {

    function match(value) {
        for (var key in attrs) {
            if (attrs[key] !== value[key]) {
                return false;
            }
        }

        return true;
    }

    function traverse(value) {
        var result;

        _.forEach(value, function (val) {
            if (val && match(val)) {
                result = val;
                return false;
            }

            if (_.isObject(val) || _.isArray(val)) {
                result = traverse(val);
            }

            if (result) {
                return false;
            }
        });

        return result;
    }

    return traverse(items);

}

var formattedJson = [];
var currentFormattedDataIndex = 0;

function formatData(element, descArr) {
    if (currentFormattedDataIndex === descArr.length - 1) {
        var lastValueWithContent = {
            desc: descArr[currentFormattedDataIndex],
            level: currentFormattedDataIndex,
            description: element.description,
            passed: element.passed,
            os: element.os,
            browser: element.browser,
            message: element.message,
            trace: element.trace,
            screenShotFile: element.screenShotFile
        };
        if (element.startTime && element.endTime) {
            lastValueWithContent.startTime = element.startTime;
            lastValueWithContent.endTime = element.endTime;
        }
        var parentDataForFinalValue = findDeep(formattedJson, {
            desc: descArr[currentFormattedDataIndex - 1],
            level: currentFormattedDataIndex - 1
        });
        if (parentDataForFinalValue) {
            parentDataForFinalValue.children = parentDataForFinalValue.children || [];
            parentDataForFinalValue.children.push(lastValueWithContent);
        }

        currentFormattedDataIndex = 0;
    } else {
        var currentdata = {
            desc: descArr[currentFormattedDataIndex],
            level: currentFormattedDataIndex
        };
        var existingDataWithSameConf = findDeep(formattedJson, currentdata);
        if (!existingDataWithSameConf) {
            if (currentFormattedDataIndex === 0) {
                currentdata.depth = descArr.length;
                formattedJson.push(currentdata);
            } else {
                var parentData = findDeep(formattedJson, {
                    desc: descArr[currentFormattedDataIndex - 1],
                    level: currentFormattedDataIndex - 1
                });
                if (parentData) {
                    parentData.children = parentData.children || [];
                    parentData.children.push(currentdata);
                }

            }

        }

        currentFormattedDataIndex++;
        formatData(element, descArr);
    }

}

function processJson(jsonData, options){
    reporterOptions = options;
    var jsonStr = "";
    formattedJson = [];
    currentFormattedDataIndex = 0;

    /* extract mix suites, sort and add back to report at the end */
    if (global.UnmixSuite && global.UnmixSuite.length > 0) {
        var sortFunc = function(a, b) {
            var arr1 = a.description.split("|");
            var arr2 = b.description.split("|");
            var translateNum = function(x) {
                while (x.length < 5) x = "a" + x;
                return x.replace(/0|1|2|3|4|5|6|7|8|9/g, function(n) {return String.fromCharCode(97 + parseInt(n))});
            };

            var suite1 = arr1[1].replace(/[0-9]+/g, translateNum);
            var suite2 = arr2[1].replace(/[0-9]+/g, translateNum);
            var result = (suite1 > suite2) - (suite1 < suite2);

            if (!result) {
                var test1 = arr1[0].replace(/[0-9]+/g, translateNum);
                var test2 = arr2[0].replace(/[0-9]+/g, translateNum);
                result = (test1 > test2) - (test1 < test2);
            }
            return result;
        };

        var mixedSuites = {};
        for (var i = jsonData.length - 1; i >= 0; i--) {
            var suite = jsonData[i].description.split("|")[1];
            if (global.UnmixSuite.indexOf(suite) >= 0) {
                if (typeof mixedSuites[suite] === "undefined") mixedSuites[suite] = [];
                mixedSuites[suite].push(jsonData[i]);
                jsonData.splice(i, 1);
            }
        }

        for (var suite in mixedSuites) {
            mixedSuites[suite].sort(sortFunc);
            jsonData.push.apply(jsonData, mixedSuites[suite]);
        }
    }

    _.each(jsonData, function (value) {
        var descArr = value.description.split('|').reverse();
        if (descArr.length > 0) {
            formatData(value, descArr);
        }
    });

    function parseJSON(element) {
        if(element.children){
            var report = {};
            report.name = element.desc;
            report.passCount = 0;
            report.failCount = 0;
            report.total = element.children.length;

            element.children.forEach(function (e){
                if (e.passed) report.passCount++;
                else report.failCount++;

            });
            reportInfo[report.name] = report;

            jsonStr += '<tr><td colspan="6"><h3 id="' + element.desc + '" align="center">'+element.desc+ '</h3>';
            if (detailReport.hasOwnProperty(element.desc)){
                var obj = detailReport[element.desc][0];
                if (typeof obj === "undefined")
                    obj = detailReport[element.desc]["-1"];
                if (typeof obj === "undefined")
                    obj = detailReport[element.desc][1];

                for (var j = 0; j < obj.length; j++) {
                    if (obj[j].type === 'link') {
                        jsonStr += '<a target="_blank" href="' + obj[j].url +
                            '">' + obj[j].text + '</a><br>';
                    }
                    else {
                        jsonStr += obj[j].text + '<br>';
                    }
                }
            }
            jsonStr += '</td></tr>';

            element.children.forEach(function (child, index, childArr) {
                if (child.children) {
                    parseJSON(child);
                }else{
                    var ss = generateHTML(child);
                    jsonStr += ss;
                    if(index === childArr.length-1){
                    }
                }
            });
            return jsonStr;
        }

    }

    var tableHtml = "";
    formattedJson.forEach(function (element) {


        jsonStr = "";
        tableHtml += parseJSON(element);
        tableHtml += new Array(element.depth-1).join();

    });

    tableHtml = tableHtml;
    var finalHtml = phssr.makeHTMLPage(tableHtml, reporterOptions);
    return finalHtml;
}

function msToTime(duration) {
    var milliseconds = parseInt( (duration % 1000) / 100 )
        , seconds = parseInt( (duration / 1000) % 60 )
        , minutes = parseInt( (duration / (1000 * 60) ) % 60 )
        , hours = parseInt( (duration / (1000 * 60 * 60) ) % 24);

    if (hours < 10) hours = "0" + hours;
    if (minutes < 10) minutes = "0" + minutes;
    if (seconds < 10) seconds = "0" + seconds;

    return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

function JSON2File(obj, path, file) {
    "use strict";
    var fs = require('fs');
    var skip = false;

    try {
        fs.mkdirSync(path);
    } catch(e) {
        if ( e.code != 'EEXIST' ) {
            skip = true;
            console.log("can't create folder " + path);
        }
    }

    if (!skip)
        fs.writeFileSync(path + "/" + file, JSON.stringify(obj));
}

function buildSummaryReport() {
    var totalTest = 0, totalPass = 0, totalFail = 0, passPercent = 0, suiteCount = 0;
    var htmlCode = "<p><b>This report was generated on "+new Date()+" </b></p>";
    //add total test time if available
    if (typeof TotalTestTime !== "undefined") htmlCode += "<p><b>Total test time: " + msToTime(TotalTestTime) +"</b></p>";

    var jqcode = "\"javascript:(function(){$('tr:has(td:nth-child(2):contains(_STATUS_))').toggle()})()\"";
    var header = "<h2 align='center'>Summary Report</h2>" +
        "<table>" +
        "<tr class='header' align='center'><th>Test suite</th><th>Total cases</th><th class='clickable' onclick=_PASS_>Pass</th><th class='clickable' onclick=_FAIL_>Fail</th></tr>";
    header = header.replace("_PASS_", jqcode.replace("_STATUS_", "false")).replace("_FAIL_", jqcode.replace("_STATUS_", "true"));
    htmlCode += header;

    for (var key in reportInfo) {
        suiteCount++;
        var report = reportInfo[key];
        totalTest += report.total;
        totalPass += report.passCount;
        totalFail += report.failCount;
        passPercent = (report.passCount / report.total * 100);

        htmlCode += "<tr><td class='linkable' onclick=\"location.href='#" + report.name + "'\">" +
            report.name + "</td><td>" + report.total + "</td>" +
            (passPercent == 100 ? "<td style='background-color: green'>" : "<td>") +
            report.passCount + " (" + passPercent.toFixed(2).toString() + "%)</td>" +
            (passPercent == 100 ? "<td>" : "<td style='background-color: red'>") +
            report.failCount + " (" + (100 - passPercent).toFixed(2).toString() + "%)</td></tr>";
    }
    //Final total row
    passPercent = (totalPass / totalTest * 100);
    if (suiteCount > 1) {
        htmlCode += "<tr style='background-color: lightyellow'><th>All suites</th><th>" +
            totalTest + "</th><th>" +
            totalPass + " (" + passPercent.toFixed(2).toString() + "%)</th><th>" +
            totalFail + " (" + (100 - passPercent).toFixed(2).toString() + "%)</th></tr>";
    }
    htmlCode += "</table>";

    global.TotalFailCase = totalFail;
    global.TotalCase = totalTest;
    if (!global.SummaryReportName) global.SummaryReportName = "sreport.json";
    if (!global.StartTestTime) global.StartTestTime = Date.now();
    global.SummaryReport.url = baseUrl;
    global.SummaryReport.total = totalTest;
    global.SummaryReport.pass = totalPass;
    global.SummaryReport.fail = totalTest - totalPass;
    global.SummaryReport.startTime = StartTestTime;
    JSON2File(global.SummaryReport, reportPath, SummaryReportName);
    return htmlCode;
}

module.exports = {
    processJson: processJson
};
