import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');

export = PlanDailyReport;

class PlanDailyReport extends BaseWidget {
    baseClass = "widget-plandailyreport";
    toast = null;
    popup = null;
    loadWait = null;

    companyid = "";//公司id
    iszgs = false;//是否是总公司账号  
    ispartment = false;//是否为部门账号
    depid = "";

    plandailyreport_date = "";
    html = "";
    data = null;
    userid = "";
    realName = "";

    /**
     * @function 启动初始化
     */
    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();
    }

    /**
     * @function 页面初始化
     */
    initHtml() {
        var html = _.template(this.template)();
        this.setHtml(html);
        this.ready();
        this.initLoginUser();
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
     * @function 判断是否为集团账号
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
            this.domObj.find(".dailyReportCaption").text("公司/部门：");
        } else {
            if (this.ispartment == false) {
                this.domObj.find(".dailyReportCaption").text("部门：");
            } else {
                this.domObj.find(".dailyReportCaption").hide();
            }
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

    /**
     * @function 事件初始化
     */
    initEvent() {
        $.jeDate(".plandailyreport_date", {
            format: 'YYYY-MM-DD', //日期格式  
            isinitVal: true
        });

        this.domObj.find('.btn_search').on("click", function () {
            if (this.ispartment == false)
                this.depid = this.domObj.find(".department").val();
            this.userid = this.domObj.find(".users").val();
            this.companyid = this.domObj.find(".company").val();
            this.getPlanDailyReport();
        }.bind(this));


        this.domObj.find('.department').on("change", function () {
            //根据部门重新筛选用户
            this.depid = this.domObj.find('.department option:selected').val();
            this.getUser();
        }.bind(this));

        //打印
        this.domObj.find('.btn_print').on("click", function () {
            (<any>$(".plandailyreport-list")).print({
                globalStyles: false,
                mediaPrint: false,
                stylesheet: "widgets/PlanDailyReport/css/style.css",
                iframe: true,
                noPrintSelector: ".no-print",
                prepend: "",
                append: ""
            });
        }.bind(this));

        this.domObj.find('.btn_export').on("click", function () {
            mothedexport_plandailyreport();
        }.bind(this));
    }

    /**
     * @function 巡检日报查询
     */
    getPlanDailyReport() {
        this.plandailyreport_date = this.domObj.find('.plandailyreport_date').val();
        this.loadWait.Show("正在查询数据，请耐心等待...", this.domObj);
        this.realName = AppX.appConfig.realname;
        $.ajax({
            headers: this.getHeaders(1),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getDailyReport,
            data: {
                "companyid": this.companyid,
                "depid": this.depid,
                "user_id": this.userid,
                "search_date": this.plandailyreport_date
            },
            success: this.getPlanDailyReportCallback.bind(this),
            error: function (data) {
                this.loadWait.Hide();
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }


    getPlanDailyReportCallback(results) {
        console.log(results);
        this.loadWait.Hide();
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        this.data = results.result;
        var isdatas = false;
        this.html = "";
        //循环部门人员
        if (this.data != null && this.data.length > 0) {
            isdatas = true;
            for (var k = 0; k < this.data.length; k++) {
                if (k > 0) {
                    this.html += "<tr><td colspan='5' class='trspit'></td></tr>";
                }
                var resUserDetails = this.data[k];
                this.html += "<tr><td style='width: 200px;'>员工姓名</td><td colspan=2 class='ygxm'>" + (resUserDetails.statics_info.user_name ? resUserDetails.statics_info.user_name : "") + "</td>"
                    + "<td style='width: 200px;'>巡检日期</td><td class='xjrq'>" + (resUserDetails.statics_info.patrol_date ? resUserDetails.statics_info.patrol_date : "") + "</td></tr>"
                    + "<tr style='background-color:#eeeeee'><td style='width: 200px;'>巡检时长（小时）</td><td colspan=2 class='xjsc'>" + (resUserDetails.statics_info.plan_total_time != null ? (resUserDetails.statics_info.plan_total_time / 3600).toFixed(1) : "") + "</td>"
                    + "<td style='width: 200px;'>巡检里程（米）</td><td  class='xjlc'>" + (resUserDetails.statics_info.plan_total_distance != null ? resUserDetails.statics_info.plan_total_distance.toFixed(1) : "") + "</td></tr>"
                    + "<tr><td style='width: 200px;'>有效时长（小时）</td><td colspan=2  class='yxsc'>" + (resUserDetails.statics_info.total_valid_time != null ? (resUserDetails.statics_info.total_valid_time / 3600).toFixed(1) : "") + "</td>"
                    + "<td style='width: 200px;'>有效里程（米）</td><td  class='yxlc'>" + (resUserDetails.statics_info.total_valid_distance != null ? resUserDetails.statics_info.total_valid_distance.toFixed(1) : "") + "</td></tr>"
                    + "<tr style='background-color:#eeeeee'> <td style='width: 200px;'>有效平均时速（米/秒）</td><td colspan=2 class='yxpjss'>" + (resUserDetails.statics_info.total_valid_average != null ? resUserDetails.statics_info.total_valid_average.toFixed(1) : "") + "</td>"
                    + "<td style='width: 200px;'>工作量统计</td><td class='gzltj'>" + (resUserDetails.statics_info.total_percent != null ? ((resUserDetails.statics_info.total_percent * 100).toFixed(1) + "%") : "") + "</td></tr>"
                    + "<tr><td style='width: 200px;'>巡检时间段</td><td class='xjsjd' colspan='4'>" + (resUserDetails.statics_info.patrol_date_range != null ? resUserDetails.statics_info.patrol_date_range : "") + "</td></tr>"
                    + "<tr style='background-color:#eeeeee'><td colspan='5' style='text-align: center'>工作计划完成情况</td></tr>";

                //个人子计划
                if (resUserDetails.detail_info != null) {
                    for (var i = 0; i < resUserDetails.detail_info.length; i++) {
                        var isline = this.isLine(resUserDetails.detail_info[i].device_type_id);
                        var pointinfo = resUserDetails.detail_info[i].point_detail;
                        var len = pointinfo.length;
                        var percent = resUserDetails.detail_info[i].percent
                        if (isline) {
                            var totalpercent = 0;
                            for (var j = 0; j < len; j++) {
                                if (pointinfo[j].point_info != '(未检)')
                                    totalpercent += parseFloat(pointinfo[j].point_info);
                            }
                            if (len > 0) {
                                percent = (totalpercent / len * 100).toFixed(1) + "%";
                            } else {
                                percent = '0%';
                            }


                        } else {
                            if (percent == null) {
                                percent = "0%";
                            } else if (percent == 0) {
                                percent = "0%";
                            } else if (percent == 1) {
                                percent = "100%";
                            } else {
                                percent = percent * 100 + "%";
                            }
                        }
                        var backgroundColor = "white";
                        var backgroundColor2 = "#eeeeee";
                        var backgroundColor3 = "white";
                        if (i % 2 !== 0) {
                            backgroundColor = "#eeeeee";
                            backgroundColor2 = "white";
                            backgroundColor3 = "#eeeeee";

                        }
                        this.html += '<tr style="background-color:' + backgroundColor + '"> <td>计划周期</td><td colspan=2>'
                            + resUserDetails.detail_info[i].plan_date
                            + '</td><td>完成比例</td><td>' + percent + '</td>';
                        this.html += '<tr style="background-color:' + backgroundColor2 + '"> <td>片区名称</td><td  colspan=4>' + resUserDetails.detail_info[i].region_name + '</td>';

                        var splitnum = 3;
                        if (len == 0) {
                            this.html += '<tr style="background-color:' + backgroundColor3 + '"> <td rowspan="1" valign="middle">计划完成明细</td ><td colspan=4></td></tr>';
                        } else {
                            var rowslen = Math.ceil(len / splitnum);

                            this.html += '<tr style="background-color:' + backgroundColor3 + '"> <td rowspan="1" valign="middle">计划完成明细</td><td colspan=4>';
                            var childTable = '<table style="border: none !important;margin-right: 10px;" class="bordernone table table-bordered table-striped" border="0">'
                                + '<tbody><tr><td class="bordernone-width" style="border: none !important;width: 130px;font-weight: bold;text-align: center;" rowspan="' + rowslen + '">' + (isline == false ? resUserDetails.detail_info[i].must_check : "必检线(" + percent + ")") + '：</td>';
                            var km = 0;
                            for (var j = 0; j < len; j++) {//计划明细   
                                if (km > 0 && (j % splitnum) == 0) {
                                    childTable += '<tr>';
                                }
                                if (isline == false) {
                                    childTable += '<td class="bordernone" style="border: none !important;margin-right: 10px;">' + pointinfo[j].point_name + '  ' + pointinfo[j].point_info + '  ' + (pointinfo[j].point_info != '(未检)' ? '[' + pointinfo[j].point_speed + ']' : '') + '</td>';
                                } else {
                                    childTable += '<td class="bordernone" style="border: none !important;margin-right: 10px;">' + pointinfo[j].point_name + '  ' + (pointinfo[j].point_info != '(未检)' ? '(' + (parseFloat(pointinfo[j].point_info) * 100).toFixed(1) + '%)' : pointinfo[j].point_info) + '</td>'
                                }


                                if (((j + 1) % splitnum) == 0) {
                                    km = km + 1;
                                    childTable += '</tr>';
                                }
                            }
                            if ((len % splitnum) != 0) {
                                for (var kk = 0; kk < (splitnum - (len % splitnum)); kk++) {
                                    childTable += '<td class="bordernone" style="border: none !important;margin-right: 10px;"></td>';
                                }
                                childTable += '</tr>';
                            }

                            this.html += childTable + '</tbody></table></td></tr>';
                        }

                    }
                } else {
                    this.html += `<tr > <td >计划周期</td><td colspan=2></td><td>完成比例</td><td></td>`
                        + `<tr style="background-color:#eeeeee"> <td>片区名称</td><td  colspan=4></td></tr>`
                        + `<tr> <td valign="middle">计划完成明细</td ><td colspan=4></td> </tr>`;
                }

                //隐患类型统计
                if (resUserDetails.trouble_info != null) {
                    this.html += "<tr style='background-color:#eeeeee'><td colspan='5' style='text-align: center'>发现隐患明细</td></tr>"
                        //+"<tr><td>隐患统计信息</td><td colspan='4'></td></tr>"
                        + "<tr><td style='text-align:center;'>序号</td><td>隐患类型</td><td>隐患地址</td><td>隐患描述</td><td>照片张数</td></tr>";
                    if (resUserDetails.trouble_info.length > 0) {
                        for (var i = 0; i < resUserDetails.trouble_info.length; i++) {
                            var info = resUserDetails.trouble_info[i];
                            this.html += "<tr style='background-color:#eeeeee'><td style='text-align:center;'>"
                                + (i + 1) + "</td><td>"
                                + info.trouble_type_name + "</td><td>"
                                + info.address + "</td><td>"
                                + info.handle_before_notes + "</td><td>"
                                + info.pic_num + "</td></tr>";
                        }
                    } else {
                        this.html += "<tr style='background-color:#eeeeee'><td style='text-align:center;height:25px;''></td><td></td><td></td><td></td><td></td></tr>";
                    }

                } else {
                    this.html += "<tr><td colspan='5' style='text-align: center'>发现隐患明细</td></tr>"
                        //+"<tr><td>隐患统计信息</td><td colspan='4'></td></tr>"
                        + "<tr><td>序号</td><td>隐患类型</td><td>隐患地址</td><td>隐患描述</td><td>照片张数</td></tr>"
                        + "<tr><td style='height:25px;'></td><td></td><td></td><td></td><td></td></tr>";
                }
            }
        } else {
            this.html += '<tr><td>员工姓名</td><td class="ygxm" colspan=2></td>td>巡检日期</td><td class="xjrq"></td></tr>'
                + '<tr><td>巡检时长（小时）</td><td class="xjsc" colspan=2></td><td>巡检里程（米）</td>'
                + '<tdclass="xjlc"></td></tr><tr><td>有效时长（小时）</td><td colspan=2 class="yxsc"></td>'
                + '<td>有效里程（米）</td><td  class="yxlc"></td></tr><tr><td>有效平均时速（米/秒）</td>'
                + '<td colspan=2 class="yxpjss"></td><td>工作量统计</td><td class="gzltj"></td></tr><tr>'
                + '<td >巡检时间段</td><td class="xjsjd" colspan="4"></td></tr><tr>'
                + '<td colspan="5" style="text-align: center">工作计划完成情况</td></tr>';
        }


        this.domObj.find(".plandailyreport").empty().append(this.html);
        if (this.iszgs) {
            this.domObj.find(".dailyReportCaption").text("公司/部门：" + this.domObj.find(".company option:selected").text() + "/" + this.domObj.find(".department option:selected").text());
        } else {
            if (this.ispartment == false) {
                this.domObj.find(".dailyReportCaption").text("部门：" + this.domObj.find(".department option:selected").text());
            } else {
                this.domObj.find(".dailyReportCaption").hide();
            }
        }

        var myDate = new Date();
        var mytime = Functions.DateFormat(myDate, "yyyy年MM月dd日 hh:mm:ss");
        this.domObj.find(".shenhe").text("审核人：");
        this.domObj.find(".shenhe").attr("colspan", "3");
        this.domObj.find(".zhibiao").text("制表人：" + this.realName);
        this.domObj.find(".shijian").text("制表时间：" + mytime);
    }

    /**
     * @function 是否为线状
     */
    isLine(device_type_id) {
        var isexist = false;
        var id = device_type_id + "";
        for (var i = 0; i < this.config.lines.length; i++) {
            if (this.config.lines[i] == id) {
                isexist = true;
                break;
            }
        }
        return isexist;
    }

    /**
     * @function 查询部门
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
        var strdepartment = "<option value=''>全部</option>"
        $.each(results.result.rows, function (index, item) {
            strdepartment += "<option value='" + item.id + "'>" + item.name + "</option>";

        }.bind(this));
        department.append(strdepartment);
        this.depid = this.domObj.find('.department option:selected').val();
        //初始化人员
        this.getUser();
    }

    /**
     * @function 部门人员列表
     */
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

        var users = this.domObj.find(".users").empty();
        // var strusers ="";
        var strusers = "<option value=''>所有人员</option>";
        $.each(results.result.rows, function (index, item) {
            strusers += "<option value='" + item.userid + "'>" + item.username + "</option>";
        }.bind(this));
        users.append(strusers);
    }

    getStr(txt, len) {
        var lth = txt.length;
    }

    /**
     * @function 销毁页面对象
     */
    destroy() {
        this.domObj.remove();
        this.afterDestroy();
    }
}