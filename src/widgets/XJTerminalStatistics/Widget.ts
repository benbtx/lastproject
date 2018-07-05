import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');

export = XJTerminalStatistics;
class XJTerminalStatistics extends BaseWidget {
    baseClass = "widget-XJTerminalStatistics";
    toast = null;
    popup = null;
    loadWait = null;
    companyid = "";//公司id
    iszgs = false;//是否是总公司账号  
    ispartment = false;//是否为部门账号
    html = "";
    isinit = true;
    search_obj = {
        depid: "",
        userid: "",
        start_date: "",
        end_date: ""
    }

    /**
     * @function 启动初始化
     */
    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
    }

    /**
     * @function 初始化页面
     */
    initHtml() {
        var html = _.template(this.template)();
        this.setHtml(html);
        this.ready();
    }

    /**
     * @function 配置初始化
     */
    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        this.loadWait = this.AppX.runtimeConfig.loadWait;
    }

    /**
     * @function 判断是否为集团账号或子公司账号
     */
    initCompany() {
        if (AppX.appConfig.groupid != null && AppX.appConfig.groupid != "") {
            this.ispartment = true;
        }

        if (this.ispartment == false) {
            if (AppX.appConfig.range.indexOf(";") > -1) {
                var codes = AppX.appConfig.range.split(";");
                if (codes != null && codes.length > 0) {
                    for (var i = 0; i < codes.length; i++) {
                        if (codes[i] == this.config.rangeall) {
                            this.iszgs = true;
                            break;
                        }
                    }
                }
            } else {
                if (AppX.appConfig.range == this.config.rangeall) {
                    this.iszgs = true;
                }
            }
        }
    }

    /**
     * @function 根据登录账号（集团公司账号、子公司账号、部门账号）初始化
     */
    initLoginUser() {
        this.initCompany();
        this.initTableHtml();
        if (this.iszgs == true) {//集团公司账号
            this.domObj.find(".company_serch").show();
            this.getCompanyList();
            //部门列表
            this.domObj.find('.company').on("change", function () {
                this.companyid = (this.iszgs == true ? this.domObj.find(".company option:selected").val() : "");
                this.getGroup(true, this.domObj.find(".department"));
            }.bind(this));
        } else {
            this.domObj.find(".company_serch").hide();
            if (this.ispartment) {
                this.search_obj.depid = AppX.appConfig.groupid;//获取部门id
                this.domObj.find(".department_btn").hide();
                this.getUser(false, this.domObj.find(".users"));
            } else {
                this.getGroup(true, this.domObj.find(".department"));//查询部门及员工列表信息
            }
        }
    }

    /**
     * @function 初始化报表页面模板
     */
    initTableHtml() {
        if (this.iszgs) {
            this.domObj.find(".table-caption").empty().append(' <p><span class="user_name" style="float: left;">公司/员工：</span><span class="time_qj" style="float: right;">日期区间：</span></p>');
        } else {
            this.domObj.find(".table-caption").empty().append(' <p><span class="user_name" style="float: left;">员工：</span><span class="time_qj" style="float: right;">日期区间：</span></p>');
        }
    }


    /**
     * @function 根据不同账号获取headers
     * @param type 0获取自己及以下部门数据，1获取自身数据
     */
    getHeaders(type?: number) {
        var headers = null;
        switch (type) {
            case 0:
                headers = {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                    'range': AppX.appConfig.range
                };
                break;
            case 1:
                headers = {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid
                };
                break;
            default:
                headers = {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid
                };
                break;
        }
        return headers;
    }

    /**
     * @function 获取公司列表信息
     */
    getCompanyList() {
        $.ajax({
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getCompanyList,
            success: function (results) {
                var that = this;
                if (results.code != 1) {
                    that.toast.Show(results.message);
                    return;
                }
                var strdepartment = "";//"<option value=''>全部</option>";
                $.each(results.result, function (index, item) {
                    if (AppX.appConfig.departmentid == item.companyid) {
                        strdepartment += "<option selected value='" + item.companyid + "'>" + item.company_name + "</option>";
                    } else {
                        strdepartment += "<option value='" + item.companyid + "'>" + item.company_name + "</option>";
                    }
                }.bind(this));
                this.domObj.find(".company").empty().append(strdepartment);
                this.companyid = (this.iszgs == true ? this.domObj.find(".company option:selected").val() : "");
                this.getGroup(true, this.domObj.find(".department"));//查询部门及员工列表信息            
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取公司列表数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    start = {
        format: 'YYYY-MM-DD',
        isinitVal: true,
        choosefun: function (elem, val, date) {
            var dt = new Date(val.replace(/-/g, "/"));
            this.end.minDate = Functions.DateFormat(dt, "yyyy-MM-dd");
            //this.domObj.find(".end_date").val(this.end.minDate);
        }.bind(this)
    };
    end = {
        format: 'YYYY-MM-DD',
        isinitVal: true,
        minDate: Functions.DateFormat(new Date(), "yyyy-MM-dd")
    };

    /**
     * @function 初始化时间控件
     */
    initTimeControl() {
        $.jeDate(".start_date", this.start);
        $.jeDate(".end_date", this.end);
    }

    /**
     * @function 设置查询条件
     */
    setSearchContent() {
        this.search_obj = {
            depid: (this.ispartment == false ? this.domObj.find(".department option:selected").val() : AppX.appConfig.groupid),
            userid: this.domObj.find(".users option:selected").val(),
            start_date: this.domObj.find(".start_date").val(),
            end_date: this.domObj.find(".end_date").val()
        }
    }

    /**
     * @function 初始化事件
     */
    initEvent() {
        this.initTimeControl();
        this.initLoginUser();

        //查询
        this.domObj.find('.btn_search').on("click", function () {
            this.setSearchContent();
            var st = new Date(this.search_obj.start_date.replace(/-/g, "/")), et = new Date(this.search_obj.end_date.replace(/-/g, "/"));
            if (st.getTime() - et.getTime() > 0) {
                this.toast.Show("开始时间大于结束时间！");
                return;
            }
            this.getTerminalStatistics();
        }.bind(this));

        //部门更新
        this.domObj.find('.department').on("change", function () {
            this.search_obj.depid = this.domObj.find(".department option:selected").val();
            this.getUser(false, this.domObj.find(".users"));
        }.bind(this));

        //打印
        this.domObj.find('.btn_print').on("click", function () {
            (<any>$(".xjterminalstatisticslist")).print({
                globalStyles: false,
                mediaPrint: false,
                stylesheet: "widgets/XJTerminalStatistics/css/style.css",
                iframe: true,
                noPrintSelector: ".no-print",
                prepend: "",
                append: ""
            });
        }.bind(this));

        //导出报表
        this.domObj.find('.btn_export').on("click", function () {
            mothedexport_xjterminal();
        }.bind(this));
    }

    /**
     * @function 获取终端使用情况表
     */
    getTerminalStatistics() {
        this.loadWait.Show("正在查询数据，请耐心等待...", this.domObj);
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getTerminalStatistics,
            data: {
                "start_date": this.search_obj.start_date,
                "end_date": this.search_obj.end_date,
                "depid": this.search_obj.depid,
                "userid": this.search_obj.userid
            },
            success: function (result) {
                this.loadWait.Hide();
                if (result.code != 1) {
                    this.toast.Show(result.message);
                    return;
                } else {
                    this.showTerminalStatistics(result);
                }
            }.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    /**
     * @function 显示结果
     */
    showTerminalStatistics(result) {
        this.html = "";
        // for(var j=0;j<result.result.length;j++){
        // var rows = result.result[j].info;
        var rows = result.result.info;
        if (rows != null && rows != "" && rows.length > 0) {
            for (var i = 0, length = rows.length; i < length; i++) {
                var checkTime = rows[i].check_time;
                var netState = rows[i].network_state;
                var electricity = ((rows[i].electricity == "" || rows[i].electricity == null) ? "--" : rows[i].electricity + "%");
                var workState = this.config.workStateName[rows[i].work_state];
                var color = "";
                var gpsState = rows[i].gps_state;
                var work_state = rows[i].work_state;
                if (work_state == 0 || work_state == 1 || work_state == 3) {
                    color = this.config.workStateColor[rows[i].work_state]
                }

                if (gpsState == 0) {
                    gpsState = "异常";
                } else {
                    gpsState = "正常";
                }

                if (netState == 0) {
                    netState = "异常";
                } else {
                    netState = "正常";
                }
                var backgroundColor = "#eeeeee";
                if (i % 2 == 0) {
                    backgroundColor = "white"
                }
                this.html += "<tr style='background-color:" + backgroundColor + "'><td colspan=4 style='" + (color != "" ? "background-color: " + color + ";" : "") + "'>"
                    + checkTime + "</td><td  colspan=3 style='" + (color != "" ? "background-color: " + color + ";" : "") + (workState == '异常' ? "color:red;font-weight:bold;" : "") + "'>"
                    + workState + "</td><td  colspan=3 style='" + (color != "" ? "background-color: " + color + ";" : "") + (gpsState == '异常' ? "color:red;font-weight:bold;" : "") + "'>"
                    + gpsState + "</td><td   colspan=3 style='" + (color != "" ? "background-color: " + color + ";" : "") + (netState == '异常' ? "color:red;font-weight:bold;" : "") + "'>"
                    + netState + "</td><td  colspan=3 style='" + (color != "" ? "background-color: " + color + ";" : "") + "'>"
                    + electricity
                    + "</td></tr>";
            }
        }
        // }      

        this.domObj.find(".terminalstatistics-list").empty().append(this.html);
        if (this.iszgs) {
            this.domObj.find(".user_name").text("公司/员工：" + this.domObj.find(".company option:selected").text() + "/" + this.domObj.find(".users option:selected").text());
        } else {
            this.domObj.find(".user_name").text("员工：" + this.domObj.find(".users option:selected").text());
        }

        this.domObj.find(".time_qj").text("日期区间：" + this.domObj.find(".start_date").val() + "~" + this.domObj.find(".end_date").val());
        var myDate = new Date();
        var mytime = Functions.DateFormat(myDate, "yyyy年MM月dd日 hh:mm:ss");
        this.domObj.find(".shenhe").text("审核人：");
        this.domObj.find(".zhibiao").text("制表人：" + AppX.appConfig.realname);
        this.domObj.find(".shijian").text("制表时间：" + mytime);
    }

    /**--------------------------查询字典---------------------*/
    /**
     * @function 部门列表
     * @param isall 是否显示全部
     * @param obj 对象
     */
    getGroup(isall, obj) {
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getGroup,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "companyid": this.companyid
            },
            success: function (results) {
                var that = this;
                if (results.code != 1) {
                    that.toast.Show(results.message);
                    return;
                }
                var strdepartment = "";
                if (isall == true) {
                    strdepartment = "<option value=''>全部</option>"
                }
                $.each(results.result.rows, function (index, item) {
                    strdepartment += "<option value='" + item.id + "'>" + item.name + "</option>";
                }.bind(this));
                obj.empty().append(strdepartment);
                this.search_obj.depid = this.domObj.find(".department option:selected").val();
                this.getUser(false, this.domObj.find(".users"))
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json"
        });
    }

    /**
     * @function 获取人员列表
     * @param isall
     * @param obj
     */
    getUser(isall, obj) {
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            dataType: "json",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getUser,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "depid": this.search_obj.depid,
                "companyid": this.companyid
            },
            success: function (result) {
                if (result.code != 1) {
                    this.toast.Show(result.message);
                    return;
                }
                var stroption = "<option value=''>全部</option>";
                if (isall == false) {
                    stroption = "";
                }
                result.result.rows.forEach(function (row) {
                    stroption += "<option value='" + row.userid + "'>" + row.username + "</option>";
                }.bind(this));
                obj.empty().append(stroption);
                if (this.isinit) {//初始化查询
                    this.isinit = false;
                    this.setSearchContent();
                    this.getTerminalStatistics();
                }
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this)
        });
    }


    /**
     * @function 销毁对象
     */
    destroy() {
        this.domObj.remove();
        this.afterDestroy();
    }
}