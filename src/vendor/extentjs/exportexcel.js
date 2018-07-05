var idTmr;
function  getExplorer() {
                    var explorer = window.navigator.userAgent ;                   
                    //ie  
                    if (explorer.indexOf("MSIE") >-1) { 
                                         
                        return 'ie';
                    }
                    else if(!!window.ActiveXObject || "ActiveXObject" in window){
                        return 'ie';
                    }
                    //firefox  
                    else if (explorer.indexOf("Firefox") >= 0) {
                        return 'Firefox';
                    }
                    //Chrome  
                    else if(explorer.indexOf("Chrome") >= 0){
                        return 'Chrome';
                    }
                    //Opera  
                    else if(explorer.indexOf("Opera") >= 0){
                        return 'Opera';
                    }
                    //Safari  
                    else if(explorer.indexOf("Safari") >= 0){
                        return 'Safari';
                    }
                   
                }
                /**
                 * @function 导出excel
                 * @param divId 导出div的id
                 * @param excelName 导出表名
                 * @param linkid a标签id
                 */
                function exportExcel(divId,excelName,linkid) {                      
                    if(getExplorer()=='ie')
                    {
                        var curTbl = document.getElementById(divId);
                        var oXL = new ActiveXObject("Excel.Application");
                        var oWB = oXL.Workbooks.Add();
                        var xlsheet = oWB.Worksheets(1);
                        var sel = document.body.createTextRange();
                        sel.moveToElementText(curTbl);
                        sel.select();
                        sel.execCommand("Copy");
                        xlsheet.Paste();
                        oXL.Visible = true;

                        try {
                            var fname = oXL.Application.GetSaveAsFilename(excelName+"-" + getDataTime()+".xls", "Excel Spreadsheets (*.xls), *.xls");
                        } catch (e) {
                            print("Nested catch caught " + e);
                        } finally {
                            oWB.SaveAs(fname);
                            oWB.Close(savechanges = false);
                            oXL.Quit();
                            oXL = null;
                            idTmr = window.setInterval("Cleanup();", 1);
                        }
                    }
                    else
                    {
                        tableToExcel(divId,linkid,excelName+"-" + getDataTime()+".xls");
                    }
                }
                function Cleanup() {
                    window.clearInterval(idTmr);
                    CollectGarbage();
                }

                function getDataTime() {
                    var date = new Date();
                    var resultArr = new Array();
                    resultArr.push(date.getFullYear());
                    resultArr.push(date.getMonth() + 1);
                    resultArr.push(date.getDate());
                    resultArr.push(date.getHours());
                    resultArr.push(date.getMinutes());
                    resultArr.push(date.getSeconds());
                    resultArr.push(date.getMilliseconds());
                    return resultArr.join('');
                }
                
                var tableToExcel = (function() {
                    var uri = 'data:application/vnd.ms-excel;base64,',
                        template = '<html><head><meta charset="UTF-8"></head><body>{table}</body></html>',
                        base64 = function(s) { return window.btoa(unescape(encodeURIComponent(s))) },
                        format = function(s, c) {
                            return s.replace(/{(\w+)}/g,
                                function(m, p) { return c[p]; }) }
                    return function(table, name,filename) {
                        if (!table.nodeType) 
                            table = document.getElementById(table);
                        var ctx = {worksheet: name || 'Worksheet', table: table.innerHTML}
                        document.getElementById(name).href = uri + base64(format(template, ctx));
                        document.getElementById(name).download = filename;
                        document.getElementById(name).click();
                        
                    }
                })()                