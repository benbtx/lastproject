import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');
export = HiddenDangerQueryReport;

class HiddenDangerQueryReport extends BaseWidget {
    baseClass = "widget-hiddendangerqueryreport";
    toast = null;
    popup = null;
    loadWait = null;
    companyid = "";//公司id
    iszgs = false;//是否是总公司账号  
    ispartment = false;//是否为部门账号

    hiddendangerqueryreport_begindate = "";
    hiddendangerqueryreport_enddate = "";


    department = "";
    trouble_typeid = "";
    pdaid = "";
    userid = "";
    padname = "";

    handle_state = "";
    handle_trouble_clear = "";

    currentpage = 1;
    currentpagesieze = 13;






    chartdata = [];
    alllayersbardata = [];//所有当前查询图层的柱状图图层数组：每个对象包含一个图层名和柱状图数据对象（bar_dataZoom-bar_yAxis等属性）


    global_Html = "";

    clearInterval = 0;

    html = ``;



    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
    }
    initHtml() {
        var html = _.template(this.template)();
        this.setHtml(html);
        this.ready();
        this.initDateWeight();

        //初始化设备
        this.getDevices();

        //初始化隐患类型
        this.getTroubleTypes();

        this.initLoginUser();
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
                this.companyid = this.domObj.find(".company option:selected").val();
                if (this.companyid == "") {
                    this.domObj.find(".department").prop("disabled", true);
                } else {
                    this.domObj.find(".department").prop("disabled", false);
                }
                this.getGroup();
            }.bind(this));
        } else {
            this.domObj.find(".company_serch").hide();
            if (this.ispartment) {
                this.department = AppX.appConfig.groupid;//获取部门id
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
            this.domObj.find(".table-caption").empty().append('<div class="cxqj" style="float:left;">查询日期：</div>');
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
                var strdepartment = "<option value=''>全部</option>";
                $.each(results.result, function (index, item) {
                    // if(AppX.appConfig.departmentid==item.companyid){
                    // strdepartment += "<option selected value='" + item.companyid + "'>" + item.company_name + "</option>";
                    // }else{
                    strdepartment += "<option value='" + item.companyid + "'>" + item.company_name + "</option>";
                    // }   
                }.bind(this));
                this.domObj.find(".company").empty().append(strdepartment);
                this.companyid = (this.iszgs == true ? this.domObj.find(".company option:selected").val() : "");
                if (this.companyid == "") {
                    this.domObj.find(".department").prop("disabled", true);
                } else {
                    this.domObj.find(".department").prop("disabled", false);
                }
                this.getGroup();//查询部门及员工列表信息            
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
            // this.domObj.find(".hiddendangerqueryreport_enddate").val(this.end.minDate);
        }.bind(this)
    };
    end = {
        format: 'YYYY-MM-DD',
        isinitVal: true,
        minDate: Functions.DateFormat(new Date(), "yyyy-MM-dd")
    };

    //初始化日期控件（pensiveant）
    initDateWeight() {
        $.jeDate(".hiddendangerqueryreportinfo-search input.hiddendangerqueryreport_begindate", this.start);
        $.jeDate(".hiddendangerqueryreportinfo-search input.hiddendangerqueryreport_enddate", this.end);
    }

    initEvent() {

        this.domObj.find('.btn_search').on("click", function () {
            this.getQueryReport();
        }.bind(this));

        this.domObj.find('.btn_print').on("click", function () {
            (<any>$(".hiddendangerqueryreportinfo-list")).print({
                globalStyles: false,
                mediaPrint: false,
                stylesheet: "widgets/HiddenDangerQueryReport/css/style.css",
                iframe: true,
                noPrintSelector: ".no-print",
                prepend: "",
                append: ""
            });
        }.bind(this));

        //导出excel
        this.domObj.find('.btn_export').on("click", function () {
            mothedexport_hiddendangerquery();
        }.bind(this));
    }

    getQueryReport() {
        if (this.ispartment == false)
            this.department = this.domObj.find(".department option:selected").val();
        this.trouble_typeid = this.domObj.find(".trouble_typeid option:selected").val();
        this.pdaid = this.domObj.find(".pdaid option:selected").val()
        this.handle_state = this.domObj.find(".handle_state option:selected").val();
        this.hiddendangerqueryreport_begindate = this.domObj.find('.hiddendangerqueryreport_begindate').val();
        this.hiddendangerqueryreport_enddate = this.domObj.find('.hiddendangerqueryreport_enddate').val();
        if (this.hiddendangerqueryreport_begindate == "") {
            this.toast.Show("开始时间不能为空！");
            return;
        }
        if (this.hiddendangerqueryreport_begindate == "") {
            this.toast.Show("结束时间不能为空！");
            return;
        }
        if (new Date(this.hiddendangerqueryreport_begindate.replace(/-/g, "/")).getTime() - new Date(this.hiddendangerqueryreport_enddate.replace(/-/g, "/")).getTime() > 0) {
            this.toast.Show("开始时间不能大于结束时间！");
            return;
        }
        this.getHiddenDangerQueryReport();
    }

    getHiddenDangerQueryReport() {
        this.loadWait.Show("正在查询数据，请耐心等待...", this.domObj);
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerQueryReport,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "depid": this.department,
                "uploadtime1": this.hiddendangerqueryreport_begindate,
                "uploadtime2": this.hiddendangerqueryreport_enddate,
                "device_type_id": this.pdaid,
                "trouble_typeid": this.trouble_typeid,
                "handle_state": this.handle_state,
                "companyid": this.companyid
            },
            success: this.getHiddenDangerQueryReportCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }


    getHiddenDangerQueryReportCallback(results) {
        this.loadWait.Hide();
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        this.html = ``;
        //赋值
        for (var i = 0; i < results.result.rows.length; i++) {
            var backgroundColor = "#eeeeee";
            if (i % 2 == 0) {
                backgroundColor = "white"
            }
            this.html += '<tr style="background-color:' + backgroundColor + '"><td class="numwidth">'
                + (i + 1)
                + '</td><td>'
                + results.result.rows[i].depname
                + '</td><td>'
                + results.result.rows[i].username
                + '</td><td>'
                + results.result.rows[i].device_type_name
                + '</td><td>'
                + results.result.rows[i].trouble_type_name

                + '</td><td>'
                + (results.result.rows[i].handle_state == 0 ? "未处理" : "已处理")
                + '</td><td>'
                + (results.result.rows[i].handle_trouble_clear == 0 ? '未清除' : '已清除')
                + '</td><td>'
                + results.result.rows[i].address
                + '</td><td>'
                + results.result.rows[i].uploadtime
                + '</td></tr>';
        }


        this.domObj.find(".hiddendangerqueryreport").empty().append(this.html);
        if (this.iszgs) {
            this.domObj.find(".cxgs").text("公司：" + this.domObj.find(".company option:selected").text());
        }
        this.domObj.find(".cxqj").text("查询日期：" + this.hiddendangerqueryreport_begindate + "-" + this.hiddendangerqueryreport_enddate);

        var myDate = new Date();
        var mytime = Functions.DateFormat(myDate, "yyyy年MM月dd日 hh:mm:ss");
        this.domObj.find(".shenhe").text("审核人：");
        this.domObj.find(".zhibiao").text("制表人：" + AppX.appConfig.realname);
        this.domObj.find(".shijian").text("制表时间：" + mytime);
    }


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
                this.toast.Show("服务端ajax出错，获取数据失败!");
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
        var strdepartment = "<option value=''>所有部门</option>";
        $.each(results.result.rows, function (index, item) {
            strdepartment += "<option value='" + item.id + "'>" + item.name + "</option>";
        }.bind(this));
        department.append(strdepartment);
    }

    getDevices() {
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getDeviceList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize
            },
            success: this.getDevicesCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getDevicesCallback(results) {
        console.log(results);
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        var pdaid = this.domObj.find(".pdaid")
        pdaid.empty();
        var strequids = "<option value=''>所有类型</option>";
        $.each(results.result.rows, function (index, item) {
            strequids += "<option value='" + item.device_type_id + "'>" + item.name + "</option>";

        }.bind(this));
        pdaid.append(strequids);

        this.domObj.find(".pdaid").val(this.pdaid);
    }

    getTroubleTypes() {
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getHiddenDangerTypeList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize
            },
            success: this.getTroubleTypesCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getTroubleTypesCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }

        var trouble_typeid = this.domObj.find(".trouble_typeid")
        trouble_typeid.empty();
        var strtrouble_typeids = "<option value=''>所有隐患类型</option>";
        $.each(results.result.rows, function (index, item) {
            strtrouble_typeids += "<option value='" + item.id + "'>" + item.name + "</option>";
        }.bind(this));
        trouble_typeid.append(strtrouble_typeids);
        this.domObj.find(".trouble_typeid").val(this.trouble_typeid);
    }

    destroy() {
        this.domObj.remove();
        this.afterDestroy();
    }
}