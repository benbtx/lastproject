import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');
export = PlanTimeStatistics;

class PlanTimeStatistics extends BaseWidget {
    baseClass = "widget-plantimestatistics";
    toast = null;
    popup = null;
    loadWait = null;

    companyid = "";//公司id
    iszgs = false;//是否是总公司账号  
    ispartment = false;//是否为部门账号

    html = "";
    depid = "";
    typeselect = [];
    peridselect = [];
    starttime = "";
    endtime = "";
    userid = "";

    start = {
        format: 'YYYY-MM-DD',
        isinitVal: true,
        choosefun: function (elem, val, date) {
            var dt = new Date(val.replace(/-/g, "/"));
            this.end.minDate = Functions.DateFormat(dt, "yyyy-MM-dd");
        }.bind(this)
    };
    end = {
        format: 'YYYY-MM-DD',
        isinitVal: true
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
        this.getPlanType();
        this.getPeriod();
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
                this.getUser();
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
        this.initLoginUser();
        //查询
        this.domObj.find('.btn_search').on("click", function () {
            if (this.ispartment == false)
                this.depid = this.domObj.find(".department").val();
            //查询分析结果
            this.getplantimestatistics();
        }.bind(this));

        //打印
        this.domObj.find('.btn_print').on("click", function () {
            (<any>$(".plantimestatistics-list")).print({
                globalStyles: false,
                mediaPrint: false,
                stylesheet: "widgets/plantimestatistics/css/style.css",
                iframe: true,
                noPrintSelector: ".no-print",
                prepend: "",
                append: ""
            });
        }.bind(this));

        this.domObj.find('.btn_export').on("click", function () {
            mothedexport_timestatistics();
        }.bind(this));

        this.domObj.find('.department').on("change", function () {
            //根据部门重新筛选用户
            if (this.ispartment == false)
                this.depid = this.domObj.find('.department option:selected').val();
            this.getUser();
        }.bind(this));
    }

    /**
     * @function 添加标题
     */
    addtitle() {
        var htmStr = '<tr><th rowspan="2">员工姓名</th><th rowspan="2">部门</th> <th rowspan="2">巡检周期</th>';
        for (var i = 0; i < this.typeselect.length; i++) {
            htmStr += '<th rowspan="2">' + this.config.device_name_selects[this.typeselect[i] + ""] + '</th>'
        }
        htmStr += ' <th colspan="2">完成比例</th></tr><tr><th>点</th><th>线</th></tr>';
        this.domObj.find('.plantime_title').empty().append(htmStr);


        var htmStr_colgroup = '<col width="100"> <col width="120"> <col width="100">';
        for (var i = 0; i < this.typeselect.length; i++) {
            htmStr_colgroup += ' <col width="120">'
        }
        htmStr_colgroup += '<col width="80" span="2">';
        this.domObj.find('.col_group').empty().append(htmStr_colgroup);
    }

    /**
     * 获取年报统计信息
     */
    getplantimestatistics() {
        this.starttime = this.domObj.find(".begindate").val();
        this.endtime = this.domObj.find(".enddate").val();
        if ((new Date(this.starttime.replace(/-/g, "/"))).getTime() - (new Date(this.endtime.replace(/-/g, "/"))).getTime() > 0) {
            this.toast.Show("开始时间不能大于结束时间！");
            return;
        }
        var that = this;
        this.typeselect = []
        $('.plantype option:selected').each(function () {
            that.typeselect.push($(this).val());
        });

        this.peridselect = []
        $('.periodid option:selected').each(function () {
            that.peridselect.push($(this).val());
        });
        if (this.typeselect.length == 0) {
            this.toast.Show("管线类型必须选择");
            return;
        }
        this.addtitle();
        this.userid = this.domObj.find("users option:selected").val();
        this.loadWait.Show("正在查询数据，请耐心等待...", this.domObj);
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getAnnualStatistics,
            data: {
                "deptid": this.depid,
                "userid": this.userid,
                "companyid": this.companyid,
                "start_date": this.starttime,
                "end_date": this.endtime,
                "device_type_ids": this.typeselect,
                "period_ids": this.peridselect
            },
            success: this.getplantimestatisticsCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getplantimestatisticsCallback(results) {
        console.log(results);
        this.loadWait.Hide();
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        this.html = ``;
        var userinfos = [];
        for (var i = 0; i < results.result.rows.length; i++) {
            var userinfo = results.result.rows[i];
            var sameuser = null;
            for (var k = 0; k < userinfos.length; k++) {
                if (userinfos[k].userid == userinfo.userid) {
                    sameuser = userinfos[k];
                    break;
                }
            }
            var item = {
                "period_id": userinfo.period_id,
                "period": userinfo.period,
                "details": userinfo.details,
                "completepercent": { point: 0, line: 0 }
            };
            userinfo["userinfos"] = [item];
            var pointper = [0, 0], lineper = [0, 0];
            if (userinfo.details && userinfo.details.length > 0) {
                for (var n = 0; n < userinfo.details.length; n++) {
                    if (userinfo.details[n].device_type_id == "1") {//巡检点
                        pointper[0] += userinfo.details[n].isover;
                        pointper[1] += userinfo.details[n].total;
                    } else {
                        lineper[0] += userinfo.details[n].isover;
                        lineper[1] += userinfo.details[n].total;
                    }
                }
            }
            item.completepercent.point = (pointper[1] == 0 ? 0 : (pointper[0] / pointper[1]) * 100);
            item.completepercent.line = (lineper[1] == 0 ? 0 : (lineper[0] / lineper[1]) * 100);
            if (sameuser == null) {
                userinfos.push(userinfo);
            } else {
                sameuser.userinfos.push(item);
            }
        }
        //页面渲染
        for (var i = 0; i < userinfos.length; i++) {
            var info = userinfos[i];
            var count = info.userinfos.length;
            var backgroundColor = "#eeeeee";
            if (i % 2 == 0) {
                backgroundColor = "white"
            }
            var htmstrs = "<tr  style='background-color:"+ backgroundColor + "'><td rowspan='" + count + "'>" + info.user
                + "</td><td rowspan='" + count + "'>" + info.dept + "</td>"
                + "</td><td rowspan='" + count + "'>" + info.period + "</td>";
            for (var j = 0; j < count; j++) {
                var detobj = info.userinfos[j];
                var details = detobj.details;
                var detailStr = "";
                for (var k = 0; k < this.typeselect.length; k++) {//具体完成情况
                    var dobj = this.getIndexObj(details, k);
                    if (dobj != null) {
                        if (dobj.isover != 0 || dobj.total != 0) {
                            detailStr += "<td>" + dobj.isover + "/" + dobj.total + "</td>";
                        } else {
                            detailStr += "<td>无</td>";
                        }
                    }
                    else {
                        detailStr += "<td>无</td>";
                    }
                }
                detailStr += "<td>" + detobj.completepercent.point.toFixed(2) + "%</td><td>" +
                    detobj.completepercent.line.toFixed(2) + "%</td>"
                if (j == 0) {
                    htmstrs += detailStr + "</tr>";
                } else {
                    htmstrs += "<tr>" + detailStr + "</tr>";
                }
            }

            this.html += htmstrs;
        }
        this.domObj.find(".plantimestatistics").empty().append(this.html);
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
     * @function 标题对应信息
     * @param infos 计划完成信息集合
     * @param index 顺序号
     */
    getIndexObj(infos, index) {
        var robj = null;
        if (index < this.typeselect.length) {
            for (var i = 0; i < infos.length; i++) {
                if (this.typeselect[index] == infos[i].device_type_id) {
                    robj = infos[i];
                    break;
                }
            }
        }
        return robj;
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
        this.depid = this.domObj.find(".department option:selected").val();
        this.getUser();
    }

    getUser() {
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getUserList,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize,
                "depid": this.depid,
                "companyid": this.companyid
            },
            success: this.getUserListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getUserListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        var strusers = "<option value=''>所有人员</option>";
        $.each(results.result.rows, function (index, item) {
            strusers += "<option value='" + item.userid + "'>" + item.username + "</option>";
        }.bind(this));
        this.domObj.find(".users").empty().append(strusers);
    }

    /**
    * @function 获取巡检类型
    */
    getPlanType() {
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPlanType,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize
            },
            success: this.getPlanTypeListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getPlanTypeListCallback(results) {
        var that = this;
        if (results.code != 1) {
            this.toast.Show(results.message);
            return;
        }
        var strplantype = "";
        $.each(results.result.rows, function (index, item) {
            if (this.config.device_type_selects.indexOf(item.device_type_id + "") > -1)
                strplantype += "<option selected value='" + item.device_type_id + "' data-device_id='" + item.device_id + "'>" + item.name + "</option>";
        }.bind(this));
        this.domObj.find(".plantype").empty().append(strplantype);
        $('.plantype').multiselect({
            nonSelectedText: '请选择',
            allSelectedText: '全被选中',
            nSelectedText: "个被选中",
            numberDisplayed: 1,
            enableCollapsibleOptGroups: true,
            includeSelectAllOption: true,
            selectAllText: '全选',
            maxHeight: 150,
        });
        this.typeselect = []
        $('.plantype option:selected').each(function () {
            that.typeselect.push($(this).val());
        });
    }

    /**
     * @function 获取巡检周期
     */
    getPeriod() {
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getPeriod,
            data: {
                "pageindex": 1,
                "pagesize": this.config.maxsize
            },
            success: this.getPeriodListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getPeriodListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        var strperiod = "";
        $.each(results.result, function (index, item) {
            strperiod += "<option selected value='" + item.period_id + "'  data-days='" + item.interval_days + "'>" + item.period_name + "</option>";
        }.bind(this));
        this.domObj.find(".periodid").empty().append(strperiod);
        $('.periodid').multiselect({
            nonSelectedText: '请选择',
            allSelectedText: '全被选中',
            nSelectedText: "个被选中",
            numberDisplayed: 1,
            enableCollapsibleOptGroups: true,
            includeSelectAllOption: true,
            selectAllText: '全选',
            maxHeight: 150
        });


        this.peridselect = []
        $('.periodid option:selected').each(function () {
            that.peridselect.push($(this).val());
        });
    }

    /**
     * 销毁对象
     */
    destroy() {
        this.domObj.remove();
        this.afterDestroy();
    }
}