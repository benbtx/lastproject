import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');
export = PlanAnnualStatistics;

class PlanAnnualStatistics extends BaseWidget {
    baseClass = "widget-planannualstatistics";
    toast = null;
    popup = null;
    loadWait = null;

    companyid = "";//公司id
    iszgs = false;//是否是总公司账号  
    ispartment = false;//是否为部门账号

    html = "";
    depid = "";
    starttime = "";
    endtime = "";

    start = {
        format: 'YYYY-MM',
        isinitVal: true,
        choosefun: function (elem, val, date) {
            var dt = new Date(val.replace(/-/g, "/") + "/01");
            this.end.minDate = Functions.DateFormat(dt, "yyyy-MM-dd");
            var dtnum = dt.getMonth() + 13;
            if (dtnum > 12) {
                dt.setFullYear(dt.getFullYear(), 11);
            }
            var dtstr = Functions.DateFormat(dt, "yyyy-MM");
        }.bind(this)
    };
    end = {
        format: 'YYYY-MM',
        isinitVal: false,
        minDate: '2016-08'
    };

    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
    }

    initHtml() {
        var html = _.template(this.template)();
        this.setHtml(html);
        this.ready();
    }

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
                this.getGroup();
            }.bind(this));
        } else {
            this.domObj.find(".company_serch").hide();
            if (this.ispartment) {
                this.depid = AppX.appConfig.groupid;//获取部门id
                this.domObj.find(".department_btn").hide();
            } else {
                this.getGroup();//查询部门及员工列表信息
            }
        }
    }

    /**
     * @function 初始化报表页面模板
     */
    initTableHtml() {
        if (this.iszgs) {
            this.domObj.find(".table-caption").empty().append('<div class="cxgs" style="float:left;">公司：</div><div class="cxqj" style="float:right;">查询时间：</div>');
        } else {
            this.domObj.find(".table-caption").empty().append('<div class="cxqj" style="float:left;">查询时间：</div>');
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
                this.getGroup();//查询部门及员工列表信息            
            }.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取公司列表数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    initEvent() {
        $.jeDate(".begindate", this.start);
        $.jeDate(".enddate", this.end);
        var sdate = new Date();
        var edate = new Date();
        var dtnum = edate.getMonth() + 13;
        if (dtnum > 12) {
            edate.setFullYear(edate.getFullYear(), 11);
        }
        var dtstr = Functions.DateFormat(edate, "yyyy-MM");
        this.domObj.find('.enddate').val(dtstr);
        this.domObj.find('.begindate').val(Functions.DateFormat(sdate, "yyyy-MM"));
        this.end.minDate = Functions.DateFormat(sdate, "yyyy-MM") + "-01";
        this.initLoginUser();
        //查询
        this.domObj.find('.btn_search').on("click", function () {
            if (this.ispartment == false)
                this.depid = this.domObj.find(".department").val();
            this.companyid = this.domObj.find(".company").val();
            //查询分析结果
            this.getPlanAnnualStatistics();
        }.bind(this));

        //打印
        this.domObj.find('.btn_print').on("click", function () {
            (<any>$(".planannualstatistics-list")).print({
                globalStyles: false,
                mediaPrint: false,
                stylesheet: "widgets/PlanAnnualStatistics/css/style.css",
                iframe: true,
                noPrintSelector: ".no-print",
                prepend: "",
                append: ""
            });
        }.bind(this));

        this.domObj.find('.btn_export').on("click", function () {
            mothedexport_annualstatistics();
        }.bind(this));
    }

    /**
     * 获取年报统计信息
     */
    getPlanAnnualStatistics() {
        this.starttime = this.domObj.find(".begindate").val();
        this.endtime = this.domObj.find(".enddate").val();
        if ((new Date(this.starttime.replace(/-/g, "/") + "/01")).getTime() - (new Date(this.endtime.replace(/-/g, "/") + "/01")).getTime() > 0) {
            this.toast.Show("开始时间不能大于结束时间！");
            return;
        }
        this.loadWait.Show("正在查询数据，请耐心等待...", this.domObj);
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getAnnualStatistics,
            data: {
                "companyid": this.companyid,
                "depid": this.depid,
                "start_date": this.starttime,
                "end_date": this.endtime,
                "static_type": 3
            },
            success: this.getPlanAnnualStatisticsCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getPlanAnnualStatisticsCallback(results) {
        this.loadWait.Hide();
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        this.html = ``;
        var totalNum = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (var i = 0; i < results.result.length; i++) {
            totalNum[0] += (results.result[i].total_time != null ? (results.result[i].total_time / 3600.0) : 0);
            totalNum[1] += (results.result[i].total_distance != null ? (results.result[i].total_distance / 1000.0) : 0);
            totalNum[2] += (results.result[i].total_valid_time != null ? (results.result[i].total_valid_time / 3600.0) : 0);
            totalNum[3] += (results.result[i].total_valid_distance != null ? (results.result[i].total_valid_distance / 1000.0) : 0);
            totalNum[4] += (results.result[i].total_valid_average != null ? (results.result[i].total_valid_average * 3.6) : 0);
            totalNum[5] += results.result[i].trouble_num;
            totalNum[6] += results.result[i].buildingsitefinded;
            totalNum[7] += results.result[i].buildingsitecomplete;
            totalNum[8] += results.result[i].point_percent;
            totalNum[9] += results.result[i].path_percent;

            totalNum[10] += results.result[i].equipmentspatroled;
            totalNum[11] += results.result[i].equipmentsinplan;
            totalNum[12] += results.result[i].pointpatroled;
            totalNum[13] += results.result[i].pointinplan;
            totalNum[14] += results.result[i].pathpatroled;
            totalNum[15] += results.result[i].pathinplan;
            var backgroundColor = "#eeeeee";
            if (i % 2 == 0) {
                backgroundColor = "white"
            }
            this.html += '<tr style="background-color:' + backgroundColor + '"><td>'
                + (i + 1)
                + '</td><td>'
                + results.result[i].username
                + '</td><td>'
                + results.result[i].depname
                + '</td><td>'
                + (results.result[i].total_time != null ? (results.result[i].total_time / 3600.0).toFixed(2) : "")
                + '</td><td>'
                + (results.result[i].total_distance != null ? (results.result[i].total_distance / 1000.0).toFixed(3) : "")
                + '</td><td>'
                + (results.result[i].total_valid_time != null ? (results.result[i].total_valid_time / 3600.0).toFixed(2) : "")
                + '</td><td>'
                + (results.result[i].total_valid_distance != null ? (results.result[i].total_valid_distance / 1000.0).toFixed(3) : "")
                + '</td><td>'
                + (results.result[i].total_valid_average != null ? (results.result[i].total_valid_average * 3.6).toFixed(2) : "")
                + '</td><td>'
                + results.result[i].trouble_num
                + '</td><td>'
                + (results.result[i].equipmentspatroled == 0 && results.result[i].equipmentsinplan == 0 ? "无" : results.result[i].equipmentspatroled + "/" + results.result[i].equipmentsinplan)
                + '</td><td>'
                + results.result[i].buildingsitefinded
                + '</td><td>'
                + results.result[i].buildingsitecomplete
                + '</td><td>'
                + (results.result[i].pointpatroled == 0 && results.result[i].pointinplan == 0 ? "无" : results.result[i].pointpatroled + "/" + results.result[i].pointinplan)
                + '</td><td>'
                + (results.result[i].pathpatroled == 0 && results.result[i].pathinplan == 0 ? "无" : (results.result[i].pathpatroled / 1000).toFixed(2) + "/" + (results.result[i].pathinplan / 1000).toFixed(2))
                + '</td><td>'
                + (results.result[i].point_percent * 100).toFixed(2) + "%"
                + '</td><td>'
                + (results.result[i].path_percent * 100).toFixed(2) + "%"
                + '</td></tr>';
        }
        totalNum[14] = totalNum[14] / 1000.0;
        totalNum[15] = totalNum[15] / 1000.0;
        var totalBackgroundColor = "#eeeeee ";
        if ((results.result.length) % 2 == 0) {
            totalBackgroundColor = "white"
        }
        this.html += "<tr style='background-color:" + totalBackgroundColor + "'><td colspan=3>总计</td><td>"
            + totalNum[0].toFixed(2) + "</td><td>"
            + totalNum[1].toFixed(3) + "</td><td>"
            + totalNum[2].toFixed(2) + "</td><td>"
            + totalNum[3].toFixed(3) + "</td><td>"
            + (results.result.length != 0 ? (totalNum[4] / results.result.length).toFixed(2) : "0") + "</td><td>"
            + totalNum[5] + "</td><td>" + (totalNum[10] == 0 && totalNum[11] == 0 ? "无" : totalNum[10] + "/" + totalNum[11]) + "</td><td>"
            + totalNum[6] + "</td><td>"
            + totalNum[7] + "</td><td>"
            + (totalNum[12] == 0 && totalNum[13] == 0 ? "无" : totalNum[12] + "/" + totalNum[13]) + "</td><td>"
            + (totalNum[14] == 0 && totalNum[15] == 0 ? "无" : totalNum[14].toFixed(2) + "/" + totalNum[15].toFixed(2)) + "</td><td>"
            + (totalNum[12] != 0 && totalNum[13] != 0 ? (totalNum[12] / totalNum[13] * 100).toFixed(2) + "%" : 0 + "%") + "</td><td>"
            + (totalNum[14] != 0 && totalNum[15] != 0 ? (totalNum[14] / totalNum[15] * 100).toFixed(2) + "%" : 0 + "%") + "</td></tr>"

        this.domObj.find(".planannualstatistics").empty().append(this.html);
        if (this.iszgs) {
            this.domObj.find(".cxgs").text("公司：" + this.domObj.find(".company option:selected").text());
        }
        this.domObj.find(".cxqj").text("查询时间：" + this.starttime + "~" + this.endtime);
        var myDate = new Date();
        var mytime = Functions.DateFormat(myDate, "yyyy年MM月dd日 hh:mm:ss");
        this.domObj.find(".shenhe").text("审核人：");
        this.domObj.find(".zhibiao").text("制表人：" + AppX.appConfig.realname);
        this.domObj.find(".shijian").text("制表时间：" + mytime);

    }

    /**
     * 获取部门信息列表
     */
    getGroup() {
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getGroupList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "companyid": this.companyid
            },
            success: this.getGroupListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取部门数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getGroupListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }

        var department = this.domObj.find(".department").empty();
        var strdepartment = "<option value=''>全部</option>";
        $.each(results.result.rows, function (index, item) {
            strdepartment += "<option value='" + item.id + "'>" + item.name + "</option>";

        }.bind(this));
        department.append(strdepartment);
    }

    /**
     * 销毁对象
     */
    destroy() {
        this.domObj.remove();
        this.afterDestroy();
    }
}