import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');

export = PlanMonthlyReport;

class PlanMonthlyReport extends BaseWidget {
    baseClass = "widget-planmonthlyreport";
    toast = null;
    popup = null;
    loadWait = null;

    companyid = "";//公司id
    iszgs = false;//是否是总公司账号  
    ispartment = false;//是否为部门账号    

    html = "";
    data = null;
    depid = "";
    searchDate = "";
    userid = "";

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
        /*初始化日期控件（pensvieant）*/
        this.initDateWeight();
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
                this.getUser();
                this.getPlanMonthlyReport()
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
            this.domObj.find(".department_tr .tdtitcenter").text("公司/部门");
        } else {
            if (this.ispartment == false) {
                this.domObj.find(".department_tr .tdtitcenter").text("部门名称");
            } else {
                this.domObj.find(".department_tr").hide();
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
     * @function 初始化日期控件(peniveant)
     */
    initDateWeight() {
        $.jeDate(".widget-planmonthlyreport  input.date", {
            format: 'YYYY-MM', //日期格式  
            isinitVal: true,
            maxDate: $.nowDate(0),
            choosefun: function (elem, val) {
                this.searchDate = val;
            }.bind(this)
        });
        this.searchDate = this.domObj.find("input.date").val();
    }

    /**
     * @function 初始化事件
     */
    initEvent() {
        this.domObj.find('.department').on("change", function () {
            this.depid = this.domObj.find(".department option:selected").val();
            this.getUser();
        }.bind(this));

        //查询
        this.domObj.find('.btn_search').on("click", function () {
            if (this.ispartment == false)
                this.depid = this.domObj.find(".department option:selected").val();
            this.userid = this.domObj.find(".users option:selected").val();
            this.getPlanMonthlyReport();
        }.bind(this));

        //打印
        this.domObj.find('.btn_print').on("click", function () {
            (<any>$(".planmouthlyreport-list")).print({
                globalStyles: false,
                mediaPrint: false,
                stylesheet: "widgets/PlanMonthlyReport/css/style.css",
                iframe: true,
                noPrintSelector: ".no-print",
                prepend: "",
                append: ""
            });
        }.bind(this));

        this.domObj.find('.btn_export').on("click", function () {
            mothedexport_mouthlyreport();
        }.bind(this));
    }



    /**
     * 获取月报信息
     */
    getPlanMonthlyReport() {
        this.searchDate = this.domObj.find("input.date").val();
        this.loadWait.Show("正在查询数据，请耐心等待...", this.domObj);
        $.ajax({
            headers: this.getHeaders(0),
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getMonthlyReport,//
            data: {
                "depid": this.depid,
                "userid": this.userid,
                "search_date": this.searchDate
            },
            success: this.getPlanMonthlyReportCallback.bind(this),
            error: function (data) {
                this.domObj.find(".planmonthlyreport").empty()
                this.loadWait.Hide();
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }
    getPlanMonthlyReportCallback(results) {
        this.loadWait.Hide();
        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            return;
        }
        this.data = results.result;

        this.html = '';
        var gsqf = "";
        if (this.iszgs) {
            gsqf = "<tr><td class='tdtitcenter'>公司/部门</td><td class='bmmc' colspan='7'>" + (this.domObj.find(".company option:selected").text() + "/" + this.domObj.find(".department option:selected").text()) + "</td></tr>";
        } else {
            if (this.ispartment == false) {
                gsqf = "<tr><td class='tdtitcenter'>部门名称</td><td class='bmmc' colspan='7'>" + this.domObj.find(".department option:selected").text() + "</td></tr>";
            }
        }
        //主体
        this.html +=
            gsqf
            + "<tr  style='background-color:#eeeeee'><td class='tdtitcenter'>巡检月份</td><td class='xjyf'  colspan='7'></td></tr>"
            + "<tr><td class='tdtitcenter' >计划工作人数</td><td class='jh' colspan='3'></td><td class='tdtitcenter'>实际工作人数</td><td class='sj' colspan='3'></td>"
            + "</tr><tr style='background-color:#eeeeee'><td class='tdtitcenter'>实际耗时（h）</td><td class='sjhs'></td><td class='tdtitcenter'>有效耗时（h）</td><td class='yxhs'></td><td class='tdtitcenter'>总里程（km）</td><td class='zlc'></td><td class='tdtitcenter'>有效里程（km）</td><td class='yxlc'></td></tr>"
            + "<tr><td class='tdtitspit' colspan='8'>工作计划完成情况</td></tr>";
        var rowspans = 1;
        for (var spani = 0, length = results.result.plan_detail.length; spani < length; spani++) {
            var row = results.result.plan_detail[spani];
            if (row.gongdijianhu.length !== 0) {
                rowspans++;
            }
            if (row.xunjian.length !== 0) {
                rowspans++;
            }
        }
        this.html += '<tr><td class="tdtitcenter" rowspan="' + (rowspans) + '"></td>'
            + '<td class="tdtitcenter">姓名</td>'
            + '<td class="tdtitcenter">类型</td>'
            + '<td class="tdtitcenter">任务个数<br>(已报/总计)</td>'
            + '<td class="tdtitcenter" colspan="3">任务漏检<br>(未报/总计)</td>'
            + '<td class="tdtitcenter">人员签名</td>'
            + '</tr>';
        if (results.result.plan_detail.length == 0) {//加标题
            this.html += '<tr><td class="tdtitcenter" ></td>'
                + '<td class="tdtitcenter"></td>'
                + '<td class="tdtitcenter"></td>'
                + '<td class="tdtitcenter"></td>'
                + '<td class="tdtitcenter" colspan="3"></td>'
                + '<td class="tdtitcenter"></td>'
                + '</tr><tr><td class="tdtitcenter"></td>'
                + '<td class="tdtitcenter"></td>'
                + '<td class="tdtitcenter"></td>'
                + '<td class="tdtitcenter"></td>'
                + '<td class="tdtitcenter" colspan="3"></td>'
                + '<td class="tdtitcenter"></td>'
                + '</tr>';
        }
        for (var i = 0; i < results.result.plan_detail.length; i++) {
            var chtml = '';
            var dchild = results.result.plan_detail[i];
            var gongdijianhu = dchild.gongdijianhu;
            var xunjian = dchild.xunjian;
            var rowlen = 0;
            if (xunjian != null && xunjian.length > 0) {
                rowlen += 1;
            }
            if (gongdijianhu != null && gongdijianhu.length > 0) {
                rowlen += 1;
            }
          
            if (rowlen > 0) {//显示该人任务情况
                chtml += '<tr><td class="tdtitcenter" rowspan="' + rowlen + '">' + dchild.username + '</td>';
                var xjhtml = "", xjstr = "", xjfz = [], ishasxunjian = false;
                //-------------巡检
                if (xunjian != null) {
                    for (var ij = 0; ij < xunjian.length; ij++) {
                        var xunjianobj = xunjian[ij]
                        if (ij == 0) {
                            xjhtml += '<td class="tdtitcenter"  style="background-color:' + backgroundColor + '">' + dchild.xunjianname + '</td>';
                            ishasxunjian = true;
                        }
                        xjfz.push({
                            period_name: xunjianobj.period_name,
                            items: xunjianobj.detail
                        })
                        /*var isexist=false;
                        for(var kk=0;kk<xjfz.length;kk++){
                            if(xjfz[kk].period_name==xunjianobj.period_name){
                                xjfz[kk].items.push(xunjianobj);
                                isexist=true;
                            }
                        } 
                        if(isexist==false && xunjianobj.isover==0){//添加漏检
                            xjfz.push({
                                period_name:xunjianobj.period_name,
                                items:[xunjianobj]
                            });
                        }*/
                    }

                    for (var jj = 0; jj < xjfz.length; jj++) {
                        if (jj > 0) {
                            xjstr += "<br>";
                        }

                        xjstr += (jj + 1) + "、" + xjfz[jj].period_name + "<br>";

                        for (var kk = 0; kk < xjfz[jj].items.length; kk++) {
                            var itemobj = xjfz[jj].items[kk];
                            xjstr += "(" + itemobj.device_type_name + ");"
                                + itemobj.point_name
                                + "(" + itemobj.noisovertototal + ")";
                        }
                    }
                    if (ishasxunjian == true) {
                        xjhtml += '<td class="tdtitcenter">' + dchild.task_num + '</td>';
                        xjhtml += '<td colspan="3">' + xjstr + '</td>';//漏检详细内容
                        chtml += xjhtml + '<td class="tdtitcenter"  rowspan="' + rowlen + '"></td></tr>';
                    }
                }


                //---------工地监护
                var gdhtml = "", gdjhfz = [], gdstr = "", isgongd = false;
                for (var ij = 0; ij < gongdijianhu.length; ij++) {
                    var gongdijianhuobj = gongdijianhu[ij]
                    if (ij == 0) {
                        gdhtml += '<td class="tdtitcenter"  style="background-color:' + backgroundColor + '">' + dchild.gongdijianhuname + '</td>';
                        isgongd = true;
                    }
                    var isexist = false;
                    for (var kk = 0; kk < gdjhfz.length; kk++) {
                        if (gdjhfz[kk].period_name == gongdijianhuobj.period_name) {
                            gdjhfz[kk].items.push(gongdijianhuobj);
                            isexist = true;
                        }
                    }
                    if (isexist == false && gongdijianhuobj.isover == 0) {
                        gdjhfz.push({
                            period_name: gongdijianhuobj.period_name,
                            items: [gongdijianhuobj]
                        });
                    }
                }
                for (var jj = 0; jj < gdjhfz.length; jj++) {
                    gdstr += (jj + 1) + "、" + gdjhfz[jj].period_name + "<br>";
                    for (var kk = 0; kk < gdjhfz[jj].items.length; kk++) {
                        var itemobj = gdjhfz[jj].items[kk];
                        gdstr += "(" + itemobj.device_type_name + ")"
                            + itemobj.point_name
                            + "(" + itemobj.noisovertototal + ");";
                    }
                }
                if (isgongd) {
                    gdhtml += '<td class="tdtitcenter">' + dchild.task_num1 + '</td>';
                    gdhtml += '<td colspan="3">' + gdstr + '</td>';//漏检详细内容
                    if (ishasxunjian == false) {
                        chtml += gdhtml + '<td class="tdtitcenter"  rowspan="' + rowlen + '"></td></tr>';
                    } else {
                        chtml += "<tr>" + gdhtml + "</tr>";
                    }
                }

            }
            this.html += chtml;


        }

        //隐患类型统计
        if (results.result.trouble_info != null) {
            this.html += "<tr><td colspan='8' class='tdtitcenter' style='text- align:center'>发现隐患统计</td></tr>"
                + "<tr><td class='tdtitcenter'>序号</td><td colspan='5' class='tdtitcenter'>隐患类型</td><td colspan='2' class='tdtitcenter'>隐患个数</td></tr>";
            if (results.result.trouble_info.length > 0) {
                for (var i = 0; i < results.result.trouble_info.length; i++) {
                    var info = results.result.trouble_info[i];
                    var backgroundColor = "#eeeeee";
                    if (i % 2 !== 0) {
                        backgroundColor = "white";
                    }
                    this.html += "<tr style='background-color:" + backgroundColor + "'><td style='text-align:center;'>"
                        + (i + 1) + "</td><td colspan='5'>"
                        + info.trouble_type_name + "</td><td colspan='2'>"
                        + info.trouble_num + "</td></tr>";
                }
            } else {
                this.html += "<tr><td style='text-align:center;height:25px;'></td><td colspan='5'></td><td colspan='2'></td></tr>";
            }

        } else {
            this.html += "<tr><td colspan='8' class='tdtitcenter'>发现隐患统计</td></tr>"
                + "<tr><td class='tdtitcenter'>序号</td><td colspan='5' class='tdtitcenter'>隐患类型</td><td colspan='2' class='tdtitcenter'>隐患个数</td></tr>"
                + "<tr><td style='text-align:center;height:25px;'></td><td colspan='5'></td><td colspan='2'></td></tr>";
        }
        this.domObj.find(".planmonthlyreport").empty().append(this.html);
        this.domObj.find(".xjyf").text(this.data.search_date);
        this.domObj.find(".jh").text(this.data.plan_work);
        this.domObj.find(".sj").text(this.data.actual_work);
        this.domObj.find(".sjhs").text((this.data.total_time != null ? (this.data.total_time / 3600.0).toFixed(2) : ""));
        this.domObj.find(".yxhs").text((this.data.total_valid_time != null ? (this.data.total_valid_time / 3600.0).toFixed(2) : ""));
        this.domObj.find(".zlc").text((this.data.total_distance != null ? (this.data.total_distance / 1000.0).toFixed(3) : ""));
        this.domObj.find(".yxlc").text((this.data.total_valid_distance != null ? (this.data.total_valid_distance / 1000.0).toFixed(3) : ""));
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
        this.getUser();
    }

    /**
     * 部门人员
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
                this.toast.Show("服务端ajax出错，获取部门人员信息失败!");
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
        var strusers = "<option value=''>所有人员</option>";
        $.each(results.result.rows, function (index, item) {
            strusers += "<option value='" + item.userid + "'>" + item.username + "</option>";
        }.bind(this));
        users.append(strusers);
    }

    /**
     * 销毁对象
     */
    destroy() {
        this.domObj.remove();
        this.afterDestroy();
    }
}