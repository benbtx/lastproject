import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');

import Map = require("esri/map");
import GraphicsLayer = require("esri/layers/GraphicsLayer");
import PictureMarkerSymbol = require("esri/symbols/PictureMarkerSymbol");




export = XJCarState;

class XJCarState extends BaseWidget {
    baseClass = "widget-XJCarState";

    map: Map;
    terminalGraphicLayer: GraphicsLayer;
    symbol: Array<any>;
    terminalStateResult;//终端状态查询结果
    dataState = "table";//表明当前是图标还是列表状态
    userState = "all";//表明显示什么状态的用户
    currentQueryUserID;
    currentQueryDate;
    today;


    userType = "";//用户类型：总公司(superadmin)，分公司管理员(companyadmin)，分公司部门管理员(departmentadmin)
    firstRequest = true;
    carState = {
        "noWork": ["noWork", "未上班"],
        "onWork": ["workNormal", "车巡开启"],
        "offWork": ["offWork", "车巡关闭"]
    };

    startup() {
        var html = _.template(this.template.split("$$")[0])();
        this.setHtml(html);
        this.terminalStateInit();
    }
    destroy() {
        this.domObj.remove();
        this.afterDestroy();
        this.backToInit();
    }
    //回到初始状态
    backToInit() {
        if (this.terminalGraphicLayer != undefined) {
            this.map.removeLayer(this.terminalGraphicLayer);
        }
    }

    terminalStateInit() {
        var time = new Date();
        this.today = time.getFullYear() + "/" + (time.getMonth() + 1) + "/" + time.getDate(); //获取查询日期
        this.map = this.AppX.runtimeConfig.map;
        //判断用户类型
        this.judgeUserType()
        //初始化事件
        this.initEvent();

        //初始化查询界面
        this.initQueryInterface();

        // //初始化部门和人员下拉列表
        // this.initDeparmentAndUserSelet();
        //绑定查询事件
        this.domObj.find("button.terminalStateQuery").bind("click", this.terminalStateQuery.bind(this));
        this.domObj.find("div.tool-table").bind("click", this.showTerminalStateByTalbe.bind(this));
        this.domObj.find("div.picture").bind("click", this.showTerminalStateByPicture.bind(this));
        this.domObj.find("div.refresh").bind("click", this.terminalStateQuery.bind(this));
        this.domObj.find(".state .stateTool").bind("click", this.stateToolClick.bind(this)); //选择用户对于状态的数据
        //日志上下页查询
        this.domObj.find(".sideBox li.pre").bind("click", function (event) {
            var currentPage = parseInt(this.domObj.find(".sideBox li.total a").text().split('/')[0].replace("(", ""));
            var totalPage = parseInt(this.domObj.find(".sideBox li.total a").text().split('/')[1].replace(")", ""));
            if (currentPage - 1 < 1) {
                return;
            } else {
                this.requestRunLog(currentPage - 1, this.config.log.Num_pagesize, this.currentQueryUserID, this.currentQueryDate);
            }

        }.bind(this)); //选择用户对于状态的数据
        this.domObj.find(".sideBox li.next").bind("click", function (event) {
            var currentPage = parseInt(this.domObj.find(".sideBox li.total a").text().split('/')[0].replace("(", ""));
            var totalPage = parseInt(this.domObj.find(".sideBox li.total a").text().split('/')[1].replace(")", ""));
            if (currentPage + 1 > totalPage) {
                return;
            } else {
                this.requestRunLog(currentPage + 1, this.config.log.Num_pagesize, this.currentQueryUserID, this.currentQueryDate);
            }
        }.bind(this)); //选择用户对于状态的数据
    }

    judgeUserType() {
        if (AppX.appConfig.groupid != null && AppX.appConfig.groupid != "") {
            this.userType = "departmentadmin";
        } else if (/00;/.test(AppX.appConfig.range)) {
            this.userType = "superadmin";
        } else {
            this.userType = "companyadmin";
        }
    }

    initEvent() {
        //绑定公司下拉改变事件
        this.domObj.find("select.company").change(function (this) {
            //清除原有部门信息
            this.domObj.find("select.department option").remove();
            var requestCompanyId = this.domObj.find("select.company option:selected").val();
            if (requestCompanyId == "") {
                return;
            } else {
                this.requestDepartmentInfo(requestCompanyId, this.initDepartmentList.bind(this));
            }
        }.bind(this));
        //绑定部门下拉改变事件
        this.domObj.find("select.department").change(function () {
            this.domObj.find("select.user option").remove();
            var departmentId = this.domObj.find(" select.department").find("option:selected").val();
            var companyId = this.domObj.find(" select.company").find("option:selected").val();
            this.requestCarInfo(companyId, departmentId, this.initCarList.bind(this));
        }.bind(this));
    }

    /*初始化查询界面 */
    initQueryInterface() {
        switch (this.userType) {
            case "superadmin":
                this.requestCompanyInfo();//初始化公司、部门、人员查询条件
                break;
            case "companyadmin":
                this.requestDepartmentInfo(AppX.appConfig.departmentid, this.initDepartmentList.bind(this));//初始化部门、人员查询条件
                this.domObj.find("div.company").remove();
                break;
            case "departmentadmin":
                this.requestCarInfo(AppX.appConfig.departmentid, AppX.appConfig.groupid, this.initCarList.bind(this));//初始化人员查询条件
                this.domObj.find("div.company").remove();
                this.domObj.find("div.department").remove();
                break;
        }
        //初始化日期控件
        //this.dateWeightInit();
    }

    requestCompanyInfo() {
        var config = this.config.requestCompanyInfo;
        $.ajax({
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {

            },
            success: function (result) {
                if (result.code !== 1) {
                    console.log(result.message);
                } else if (result.result.length === 0) {
                    console.log(config.MSG_null);
                } else {
                    var rows = result.result;
                    var html = "<option value=''>全部</option>";
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var companyId = rows[i].companyid;
                        var companyName = rows[i].company_name;
                        var itemHtml = "<option value='" + companyId + "'>" + companyName + "</option>";
                        html += itemHtml;
                    }

                    //初始化公司下拉选项
                    this.domObj.find("select.company").append(html);
                    //自动触发
                    this.domObj.find("select.company option").attr("value", function (index, val) {
                        if (val === AppX.appConfig.departmentid) {
                            $(this).attr("selected", "selected")
                        }
                        return val;
                    });
                    this.domObj.find("select.company ").trigger("change");
                }
            }.bind(this),
            error: function (error) {
                console.log(config.MSG_error);
            }.bind(this),
            dataType: "json",
        });
    }

    //请求部门信息
    requestDepartmentInfo(companyId, callback: Function) {
        var config = this.config.requestDepartmentInfo;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                "range": AppX.appConfig.range
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "pageindex": 1,
                "pagesize": 100000,
                "companyid": companyId
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else if (result.result.rows.length === 0) {
                    toast.Show(config.MSG_null);
                } else {
                    callback(companyId, result);
                }

            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //初始化部门列表
    initDepartmentList(companyId, result) {
        this.domObj.find("select.department option").remove();
        var rows = result.result.rows;
        var html = "<option value='allDepartment'>所有</option>";
        var template = this.domObj.find("#departmentList").text();
        for (var i = 0, length = rows.length; i < length; i++) {
            var departmentName = rows[i].name;
            var departmentId = rows[i].id;
            var data = [departmentId, departmentName];
            var index = 0;
            var replaceTemplate = template.replace(/%data/g, function () {
                return (index < data.length) ? (data[index++]) : "";
            })
            html += replaceTemplate
        }
        this.domObj.find(" select.department").append(html);
        this.domObj.find("select.department").trigger("change");
    }

    //请求巡检人员信息
    requestCarInfo(companyid, departmentId, callback) {
        var config = this.config.requestCarInfo;
        var toast = this.AppX.runtimeConfig.toast;
        if (departmentId === "allDepartment") {
            departmentId = "";
        }
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                "range": AppX.appConfig.range
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_Request,
            data: {
                "pageindex": 1,
                "pagesize": 100000,
                "companyid": companyid,
                "depid": departmentId
            },
            success: function (result) {
                callback(result)
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //初始化巡检人员列表
    initCarList(result) {
        var config = this.config.initCarList;
        var rows = result.result.rows;
        var html = " <option value=''>所有</option>";
        var template = this.domObj.find(" #userList").text().trim();
        for (var i = 0, length = rows.length; i < length; i++) {
            var userName = rows[i].plate_number;
            if (userName != "管理员") {
                var userId = rows[i].id;
                var data = [userId, userName];
                var index = 0;
                var replaceTemplate = template.replace(/%data/g, function () {
                    return (index < data.length) ? (data[index++]) : "";
                })
                html += replaceTemplate
            }
        }
        this.domObj.find("select.userName option").remove();
        this.domObj.find("select.userName").append(html);
        if (this.firstRequest == true) {
            //默认查询当天
            this.domObj.find("button.terminalStateQuery").trigger("click");
            this.firstRequest = false;
        }

    }

    //初始化日期控件
    dateWeightInit() {
        //jquery 日期控件初始化
        this.domObj.find("input.date").jeDate({
            format: 'YYYY-MM-DD', //日期格式  
            isinitVal: true,
            maxDate: $.nowDate(0),
            choosefun: function (elem, val) {
                this.startDate = val;
            }.bind(this)
        })
    }





    /*
     * 查询终端信息，并以列表和图标显示 
     * 1.terminalStateQuery--
    */

    //查询点击事件回调函数
    terminalStateQuery(event) {
        var companyId = AppX.appConfig.departmentid;
        var departmentId = AppX.appConfig.groupid;
        var userID = '';
        if (this.domObj.find("select.company").length != 0) {
            companyId = this.domObj.find("select.company").find("option:selected").val();
        }
        if (this.domObj.find("select.department").length != 0) {
            departmentId = this.domObj.find("select.department").find("option:selected").val();//获取部门id
            if (departmentId === "allDepartment") {
                departmentId = " ";
            }
        }
        userID = this.domObj.find("select.userName").val(); //获取巡检人员id
        // var date = this.domObj.find("input.date").val().replace(/-/g, "/");  //获取查询日期
        var date = this.today; //获取查询日期
        this.domObj.find(".mainBox *").remove();
        this.domObj.find(".mainContent div.dataloaderleft").css("display", "block");

        this.requestTerminalState(companyId, departmentId, userID, date);
        //设置用户获取默认为全部
        this.userState = "all";
    }

    //请求终端状态信息
    requestTerminalState(companyId, departmentid, userid, queryDate) {
        var toast = this.AppX.runtimeConfig.toast;
        var config = this.config.requestTerminalState;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                "range": AppX.appConfig.range
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                'pageindex': 1,
                'pagesize': 100000,
                'companyid': companyId,
                "deptid": departmentid,
                "carid": userid,
                "search_date": queryDate,
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_error)
                } else {
                    this.requestTerminalStateCallBack(result);
                }

            }.bind(this),
            error: function () {
            },
            dataType: "json",
        });
    }

    //请求终端状态信息的回调函数
    requestTerminalStateCallBack(result) {
        this.terminalStateResult = result;
        if (this.dataState == "table") {
            this.domObj.find("div.tool-table").trigger("click");//主动触发列表显示
        } else {
            this.domObj.find('div.picture').trigger("click");//主动触发图标显示
        }
    }

    //列表形式展现终端状态
    showTerminalStateByTalbe() {
        //设置相应的表格按钮激活，图标按钮不激活
        this.domObj.find(" #toolbar div.tool-table").addClass('active');
        this.domObj.find("#toolbar div.picture").removeClass('active');
        this.domObj.find(".state .all").addClass("active");
        //清除表格之前显示的元素
        if (this.domObj.find(" .mainBox *")) {
            this.domObj.find(".mainBox *").remove();

        }
        //设置当前状态（表格显示|图标显示）
        this.dataState = "table";
        //初始化列表
        var rows = this.terminalStateResult.result.rows;
        var html = "";
        var template = this.template.split("$$")[3]
        var countAll = 0;
        var countNoWork = 0;
        var countonWork = 0;
        var countGpsError = 0;
        var countNoGps = 0;
        var countNetError = 0;
        var countOffWork = 0;

        for (var i = 0, length = rows.length; i < length; i++) {
            var data = [];
            countAll = length;
            var companyName = rows[i].company_name;//公司名称
            var departmentName = rows[i].depname;//部门名称
            var userName = rows[i].plate_number;
            var userId = rows[i].id;//用户id
            var loginTime = (rows[i].on_time !== null) ? rows[i].on_time.split(" ")[1] : "--";//上班时间
            var offTime = (rows[i].off_time !== null) ? rows[i].off_time.split(" ")[1] : "--";//下班时间
            var equipmentInfo = rows[i].equip_info;//设备状态
            var gpsState = 0;
            var netState = 0;
            // var x = rows[i].lat_lng.lng;
            // var y = rows[i].lat_lng.lat;
            /*设置巡检人员状态
             *1. 无上班时间则为未上班
             *2. 有上下班时间 则为下班
             *3. 上班（正常，gps异常，网络异常）
             */
            var userstate = this.carState.noWork[1];
            var userStateCode = this.carState.noWork[0];
            if (loginTime !== "--") {
                var runlog = rows[i].equip_info;//最新的日志
                if (runlog.gps_type === 1) {
                    userstate = this.carState.onWork[1];
                    userStateCode = this.carState.onWork[0];
                    countonWork++;
                } else if (runlog.gps_type === 0) {
                    userstate = this.carState.offWork[1];
                    userStateCode = this.carState.offWork[0];
                    countOffWork++;
                }
            } else {
                countNoWork++;
            }
            var electricity = "--";//电量
            var gpsPng = "gpsOff.png";
            var netPng = "netOff.png";
            var uploadTime = "--:--:--";
            var space = '-';
            if (equipmentInfo !== null) {
                if (equipmentInfo.electricity.length !== 0) {
                    electricity = equipmentInfo.electricity + "%";
                }
                uploadTime = equipmentInfo.check_time.split(" ")[1];
                if (gpsState == 1) {
                    gpsPng = "gpsOn.png";
                }
                if (netState == 1) {
                    netPng = "netOn.png";
                }
                if (equipmentInfo.residual_space !== "" && equipmentInfo.residual_space < 1024) {
                    space = equipmentInfo.residual_space + "M";
                } else if (equipmentInfo.residual_space !== "" && equipmentInfo.residual_space > 1024) {
                    space = (equipmentInfo.residual_space / 1024).toFixed(2) + "G";
                }

            }
            data.push(userStateCode, userId, companyName, companyName, departmentName, departmentName, userName, userName, userstate, loginTime, electricity, gpsPng, netPng, space, uploadTime);
            var index = 0;
            var templateRepalce = template.replace(/%s/g, function () {
                var itemVal = (index < data.length) ? data[index++] : '';
                return itemVal;
            });
            if (netState === 1 && gpsState === 1) {
                templateRepalce = templateRepalce.replace("red", "black");
            }
            html += templateRepalce;

            //初始化状态统计
            this.domObj.find("div.state span.countall").text("(" + countAll + ")");
            this.domObj.find("div.state span.countnowork").text("(" + countNoWork + ")");
            this.domObj.find("div.state span.countonwork").text("(" + countonWork + ")");
            this.domObj.find("div.state span.countnogps").text("(" + countNoGps + ")");
            this.domObj.find("div.state span.countgpserror").text("(" + countGpsError + ")");
            this.domObj.find("div.state span.countneterror").text("(" + countNetError + ")");
            this.domObj.find("div.state span.countoffwork").text("(" + countOffWork + ")");

        }
        this.domObj.find(".mainBox").append(this.template.split("$$")[1]);
        this.domObj.find(".mainContent div.dataloaderleft").css("display", "none");
        $(".terminalStateTable tbody ").append(html);

        //根据 用户显示界面
        switch (this.userType) {
            case "superadmin":
                break;
            case "companyadmin":

                this.domObj.find("div.mainBox .company").remove();
                break;
            case "departmentadmin":
                this.domObj.find("div.mainBox .company").remove();
                this.domObj.find(" div.mainBox  .department").remove();
                break;
        }
    }

    //图标形式展现终端状态
    showTerminalStateByPicture() {
        var config = this.config.showTerminalStateByPicture;
        //设置图标显示按下背景
        this.domObj.find(" #toolbar div.tool-table").removeClass('active');
        this.domObj.find("#toolbar div.picture").addClass('active');
        this.domObj.find(".state .all").addClass("active");
        //清除之前的元素
        if (this.domObj.find(".mainBox *")) {
            this.domObj.find(".mainBox *").remove();
        }
        //设置当前状态（表格显示|图标显示）
        this.dataState = "picture";
        //初始化图标显示
        var rows = this.terminalStateResult.result.rows;
        var html = "";
        var countAll = 0;
        var countNoWork = 0;
        var countonWork = 0;
        var countGpsError = 0;
        var countNetError = 0;
        var countNoGps = 0;
        var countOffWork = 0;
        for (var i = 0, length = rows.length; i < length; i++) {
            var username = rows[i].plate_number;
            var subUserName = username;
            if (username.length > 7) {
                subUserName = username.substr(0, 7) + "...";
            }
            countAll = length;
            var userId = rows[i].id;
            var loginTime = rows[i].on_time;//上班时间
            var offTime = rows[i].off_time;//下班时间
            var headPicture = rows[i].avatar[0];
            var x = rows[i].lng;
            var y = rows[i].lat;
            var oraginalAvatar = "no";
            if (headPicture !== "" && headPicture !== undefined) {
                var xjapiRoot = AppX.appConfig.xjapiroot;
                headPicture = xjapiRoot.substr(0, xjapiRoot.length - 3) + rows[i].avatar[0].thumbnail;//头像地址
            } else if (loginTime === null || offTime !== null) {
                headPicture = config.URL_avatarOffWork;//头像
                oraginalAvatar = "yes";
            } else {
                headPicture = config.URL_avatarOffWork;//头像
                oraginalAvatar = "yes";
            }

            /*设置巡检人员状态
              *1. 无上班时间则为未上班
              *2. 有上下班时间 则为下班
              *3. 上班（正常，gps异常，网络异常，gps和网络异常）
              */
            var userState = "";
            if (loginTime !== null) {
                var runlog = rows[i].equip_info;//最新的日志
                if (runlog.gps_type === 1) {
                    userState = this.carState.onWork[0];
                    countonWork++;
                } else if (runlog.gps_type === 0) {
                    userState = this.carState.offWork[0];
                    countOffWork++;
                }
            } else {//未上班
                var userState = this.carState.noWork[0];
                // userPng = "./widgets/TerminalState/css/img/noWork.png";
                countNoWork++;
            }
            var data = [userId, userState, oraginalAvatar, headPicture, username, subUserName];
            var template = this.template.split("$$")[2];
            var index = 0;
            var templateReplace = template.replace(/%s/g, function () {
                return (index < data.length) ? (data[index++]) : ""
            });
            html += templateReplace;

        }

        this.domObj.find(".mainContent div.dataloaderleft").css("display", "none");
        this.domObj.find(" .mainBox").append(html);
        //初始化状态统计
        this.domObj.find("div.state span.countall").text("(" + countAll + ")");
        this.domObj.find("div.state span.countnowork").text("(" + countNoWork + ")");
        this.domObj.find("div.state span.countonwork").text("(" + countonWork + ")");
        this.domObj.find("div.state span.countgpserror").text("(" + countGpsError + ")");
        this.domObj.find("div.state span.countnogps").text("(" + countNoGps + ")");
        this.domObj.find("div.state span.countneterror").text("(" + countNetError + ")");
        this.domObj.find("div.state span.countoffwork").text("(" + countOffWork + ")");

        //每个图标绑定点击事件
        this.domObj.find(".mainBox .workState div.state").bind("click", function (event) {
            var queryDate = this.domObj.find(' input.date').val().replace(/-/g, "/");
            var userId = $(event.currentTarget).attr("userid");
            this.currentQueryUserID = userId;
            this.currentQueryDate = queryDate;
            this.domObj.find(".sideBox .tableContent tbody tr").remove();//清除之前的结果
            this.domObj.find(".mainContent div.dataloaderright").css("display", "block");
            this.requestRunLog(this.config.log.Num_pageindex, this.config.log.Num_pagesize, userId, queryDate);

        }.bind(this));
        //清除右边栏日志
        this.domObj.find(".sideBox .tableContent tbody tr").remove();
        // //自动触发用户过滤
        // $(".widget-terminalstate .state div[userState=" + this.userState + "]").trigger("click");
    }

    /*
     * 显示某个状态的巡检员
     */

    //用户状态点击事件，筛选符合状态的巡检员
    stateToolClick(event) {
        var state = $(event.currentTarget).attr("userState");
        //设置所选用户的状态
        this.userState = state;
        //设置点击的状态图标为active
        this.domObj.find(".state div").removeClass("active");
        $(event.currentTarget).addClass("active");
        //根据列表还是图标，显示符合条件的用户    
        if (this.dataState == "table") {
            //显示符合条件的用户
            this.domObj.find('.mainContent .terminalStateTable tbody tr').css("display", function (index, value) {
                var userSate = this.domObj.find(".mainContent .terminalStateTable tbody tr:eq(" + index + ")").attr("userState");
                var regExp = new RegExp(state);
                if (state == "all") {
                    return "";
                } else if (regExp.test(userSate)) {
                    return "";
                } else {
                    return "none";
                }
            }.bind(this));
            //清除右边栏日志
            this.domObj.find(".sideBox .tableContent tbody tr").remove();
            // //默认查询第一个用户的运行日志
            // this.domObj.find(".mainContent .terminalStateTable tbody tr:visible:eq(0)").trigger("click");
        } else {
            //显示符合条件的用户
            this.domObj.find('.mainContent .mainBox .workState div.item').css("display", function (index, value) {
                var userSate = this.domObj.find(".mainContent .mainBox .workState div.item:eq(" + index + ")").attr("state");
                var regExp = new RegExp(state);
                if (state == "all") {
                    return "";
                } else if (regExp.test(userSate)) {
                    return "";
                } else {
                    return "none";
                }
            }.bind(this));
            //清除右边栏日志
            this.domObj.find(".sideBox .tableContent tbody tr").remove();
            // //默认查询第一个用户的运行日志
            // this.domObj.find(".mainContent .mainBox .workState div.item:visible:eq(0)").trigger("click");
        }

    }
}


