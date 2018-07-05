import BaseWidget = require('core/BaseWidget.class');
export = XJWorkerVacationManagement;

class XJWorkerVacationManagement extends BaseWidget {
    baseClass = "widget-XJWorkerVacationManagement";


    popup;//
    pageIndex;//当前显示的为第几页
    pageSize;//每页显示的条数
    userType;//用户类型


    startup() {
        this.initHtml();

    }

    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")();
        this.setHtml(html);
        this.ready();
        this.XJBuildingSiteTypeInit();

    }
    destroy() {

        this.domObj.remove();
        this.afterDestroy();
    }

    XJBuildingSiteTypeInit() {
        this.popup = this.AppX.runtimeConfig.popup;
        this.pageIndex = this.config.requestWorkerVacationInfo.Count_pageindex;
        this.pageSize = this.config.requestWorkerVacationInfo.Count_pagesize;
        //判断用户类型
        this.judgeUserType();
        this.initQueryInterface();
        this.initEvent();

    }

    //判断用户的类型（总公司，分公司，部门管理员）
    judgeUserType() {
        if (AppX.appConfig.groupid != null && AppX.appConfig.groupid != "") {
            this.userType = "departmentadmin";
        } else if (/00;/.test(AppX.appConfig.range)) {
            this.userType = "superadmin";
        } else {
            this.userType = "companyadmin";
        }
    }


    initQueryInterface() {
        if (this.userType !== "departmentadmin") {
            this.domObj.find(".departmentadmin").removeClass("departmentadmin");
        }
    }

    initEvent() {
        //checkbox 全选事件
        this.domObj.find(".list-content thead input").bind("click", this.selecteAll.bind(this));
        //工具点击事件
        this.domObj.find(" #toolbar button.toolbar").bind("click", this.toolbarClick.bind(this));
        //上一页请求事件
        this.domObj.find(".list-pagetool button.pre").bind("click", this.prePage.bind(this));
        //下一页请求事件
        this.domObj.find(".list-pagetool button.next").bind("click", this.nextPage.bind(this));
        //跳转请求事件
        this.domObj.find(".list-pagetool button.pageturning").bind("click", this.goPage.bind(this));
        //
        this.requestWorkerVacationInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
    }


    //获取员工请假信息
    requestWorkerVacationInfo(pageIndex, pageSize, name, callback) {
        var config = this.config.requestWorkerVacationInfo;
        var toast = this.AppX.runtimeConfig.toast;
        this.domObj.find(".list-content tbody tr").remove();
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid

            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "key": config.Keyconfig,
                "pageindex": pageIndex,
                "pagesize": pageSize,
                "deptid": AppX.appConfig.groupid


            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else if (result.result.rows.length === 0) {
                    toast.Show(config.MSG_null);
                } else {
                    callback(result.result);
                }
            },
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //初始化假期类型列表
    initVacationTypeList(result) {
        var rows = result.rows;
        var template = this.domObj.find(".list-content tbody #template").text().trim();
        var html = "";
        var data = [];
        for (var i = 0, length = rows.length; i < length; i++) {
            var id = rows[i].id;
            var vacationTypeId = rows[i].sys_id;
            var vacationTypeName = rows[i].vacation_type_name;
            var departmentId = rows[i].deptid;
            var departmentName = rows[i].dept;
            var vacationUserId = rows[i].userid;
            var vacationUserName = rows[i].vacation_username;
            var startTime = rows[i].start_date.split(" ")[0];
            var endTime = rows[i].end_date.split(" ")[0];
            var description = rows[i].notes;
            var creatTime = rows[i].create_time;
            var createUser = rows[i].create_user;
            data = [id, departmentId, departmentName, vacationUserId, vacationUserName, vacationTypeId, vacationTypeName, startTime, endTime, description, createUser, creatTime];
            var index = 0;
            var templateRepalce = template.replace(/%[a-zA-Z]+%/g, function () {
                return (index < data.length) ? (data[index++]) : '';
            });
            html += templateRepalce;
        }
        this.domObj.find(".list-content tbody").append(html);

        var total = result.total;//总记录数
        var pageSize = result.pagesize || 20;//每页显示几条
        var pageIndex = result.pageindex || 1;//第几页
        var totalPage = Math.ceil(parseInt(total) / parseInt(pageSize));//总页数
        this.domObj.find(".list-pagetool .pagecontrol .total").text(total);
        this.domObj.find(".list-pagetool .pagecontrol .pagesize").text(pageSize);
        this.domObj.find(".list-pagetool  span.totalpage").text(totalPage);
        this.domObj.find(".list-pagetool span.currentpage").text(pageIndex);
        //每一条记录点击事件绑定
        this.domObj.find(" .list-content tbody tr").bind("click", this.selecteItem.bind(this));
        //
        if (this.userType !== "departmentadmin") {
            this.domObj.find(".departmentadmin").removeClass("departmentadmin");
        }
    }

    //上一页
    prePage() {
        var pageIndex = parseInt(this.domObj.find(".list-pagetool button.current span.currentpage").text());
        var prePage = pageIndex - 1;
        if (prePage < 1) {
            return;
        } else {
            this.pageIndex = prePage;
            this.requestWorkerVacationInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
        }
    }

    //下一页
    nextPage() {
        var pageIndex = parseInt(this.domObj.find(".list-pagetool button.current span.currentpage").text());
        var totalPage = parseInt(this.domObj.find(".list-pagetool button.current span.totalpage").text());
        var nextPage = pageIndex + 1;
        if (nextPage > totalPage) {
            return;
        } else {
            this.pageIndex = nextPage;
            this.requestWorkerVacationInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
        }
    }

    //跳转到另外一页
    goPage() {
        var pageIndex = parseInt(this.domObj.find(".list-pagetool div.go input.currpage").val());
        var totalPage = parseInt(this.domObj.find(".list-pagetool button.current span.totalpage").text());
        var goPage = pageIndex;
        if (goPage > totalPage || goPage < 1) {
            return;
        } else {
            this.pageIndex = goPage;
            this.requestWorkerVacationInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
        }
    }

    //增、删、改等按钮点击事件
    toolbarClick(event) {
        var handleType = $(event.currentTarget).attr("handletype");
        if (handleType === "add") {
            this.popup.setSize(600, 400);
            var Obj = this.popup.Show("新增休假", this.template.split('$$')[1]);
            this.initDateWidget("#XJWorkerVacationManagement-add input.startdate", "#XJWorkerVacationManagement-add input.enddate");
            //部门用户，部门不可选
            if (this.userType == "departmentadmin") {
                Obj.conObj.find('select.department ').attr("disabled",true)
            }
            this.requestDepartmentInfo(1, 10000, AppX.appConfig.groupid, null, this.initDepartmentSelect.bind(this));
            this.requestVacationTypeList(1, 10000, null);
            Obj.submitObj.off("click").on("click", function () {
                var userID = Obj.conObj.find('select.username option:selected').val()
                var vacationType = Obj.conObj.find('select.vacationtype option:selected').val();
                var startDate = Obj.conObj.find('.startdate').val();
                var endDate = Obj.conObj.find('.enddate').val();
                var notes = Obj.conObj.find('.notes').val();
                this.addVacationType(userID, vacationType, startDate, endDate, notes, this.AppX.appConfig.realname);
            }.bind(this));
        } else if (handleType === "modify") {
            var selctedItem = this.domObj.find(".list-content tbody input:checked");
            if (selctedItem.length === 0) {
                this.AppX.runtimeConfig.toast.Show("请选择要修改的员工请假！");
            } else if (selctedItem.length > 1) {
                this.AppX.runtimeConfig.toast.Show("只能修改单条记录！");
            } else {
                var selectRow = selctedItem.parents("tr");
                var buildeSiteID = selctedItem.attr("buildsiteid");
                var departmentid = selectRow.children("td.department").attr("departmentid");//原部门id
                var userid = selectRow.children("td.name").attr("userid");//原用户id
                var vacationTypeId = selectRow.children("td.vacationtypename").attr("vacationtypeid");
                var description = selectRow.children("td.description").text();
                var time = selectRow.children("td.timespan").text();
                var startDate = selectRow.children("td.starttime").text();
                var endDate = selectRow.children("td.endtime").text();
                this.popup.setSize(600, 400);
                var Obj = this.popup.Show("修改休假", this.template.split('$$')[2]);
                //初始化原有数据
                this.initDateWidget("#XJWorkerVacationManagement-modify input.startdate", "#XJWorkerVacationManagement-modify input.enddate");
                this.requestDepartmentInfo(1, 10000, departmentid, userid, this.initDepartmentSelect.bind(this));
                this.requestVacationTypeList(1, 10000, vacationTypeId);
                Obj.conObj.find('.name').val(name);
                Obj.conObj.find('select.username').val(vacationTypeId);
                Obj.conObj.find('.notes').val(description);
                Obj.conObj.find('.startdate').val(startDate);
                Obj.conObj.find('.enddate').val(endDate);
                //提交按钮事件
                Obj.submitObj.off("click").on("click", function (event) {
                    var buildeSiteID = selctedItem.attr("buildsiteid");
                    var userID = Obj.conObj.find('select.username option:selected').val()
                    var vacationType = Obj.conObj.find('select.vacationtype option:selected').val();
                    var startDate = Obj.conObj.find('.startdate').val();
                    var endDate = Obj.conObj.find('.enddate').val();
                    var notes = Obj.conObj.find('.notes').val();
                    this.modifyVacationType(buildeSiteID, userID, vacationType, startDate, endDate, notes);
                }.bind(this));
            }

        } else if (handleType === "delete") {
            var selctedItems = this.domObj.find(".list-content tbody input:checked");
            if (selctedItems.length === 0) {
                this.AppX.runtimeConfig.toast.Show("请选择要删除的假期类型！");
            } else {

                this.popup.setSize(300, 150);
                var Obj = this.popup.ShowMessage("提示", "确认需删除选择数据？");
                Obj.submitObj.off("click").on("click", function () {
                    this.popup.Close();
                    var buildeSiteId = [];
                    selctedItems.attr("buildsiteid", function (index, val) {
                        buildeSiteId.push(val);
                        return val;
                    });
                    this.deleteVacationType(buildeSiteId, selctedItems);
                }.bind(this));

            }
        } else if (handleType === "refresh") {
            this.requestWorkerVacationInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
        }
    }

    //初始化日期控件
    initDateWidget(startSelector, endSelector) {
        $(startSelector).jeDate({
            format: 'YYYY/MM/DD', //日期格式  
            isinitVal: true,
            initAddVal: { DD: "0" },
            minDate: $.nowDate(0)
        });
        $(endSelector).jeDate({
            format: 'YYYY/MM/DD', //日期格式  
            isinitVal: true,
            initAddVal: { DD: "2" },
            minDate: $.nowDate(1)
        })
    }

    //请求巡检部门（分组）信息
    requestDepartmentInfo(pageIndex, pageSize, initDepartmentid, initUserid, callBack) {
        var config = this.config.requestDepartmentInfo;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_Request,
            data: {
                "pageindex": pageIndex,
                "pagesize": pageSize
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_Error);
                } else if (result.result.rows.length === 0) {
                    toast.Show(config.MSG_Null);
                } else {
                    callBack(initDepartmentid, initUserid, result);
                }

            }.bind(this),
            error: function () {
                toast.Show(config.MSG_Error);
            },
            dataType: "json",
        });
    }

    //获取部门列表回调函数
    initDepartmentSelect(initDepartmentid, initUserVal, result) {
        var rows = result.result.rows;
        var html = "<option value='allDepartment'>所有</option>";
        var template = $("select.department  #departmenttemplate").text();
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
        $("select.department").append(html);
        $("select.department option[value='" + initDepartmentid + "']").attr("selected", "selected");
        $("select.department").change(function () {
            var departmentId = $(" select.department").find("option:selected").val();
            //显示当前部门下的巡检人员
            $("#XJWorkerVacationManagement-add select.username option").remove();
            this.requestUserInfo(1, 1000, departmentId, initUserVal, this.initUserSelect.bind(this));
        }.bind(this));
        $("select.department").trigger('change');
    }


    //请求某个部门下的巡检人员信息
    requestUserInfo(pageIndex, pageSize, departmentId, initUserVal, callback) {
        var config = this.config.requestUserInfo;
        var toast = this.AppX.runtimeConfig.toast;
        if (departmentId === "allDepartment") {
            departmentId = "";
        }
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_Request,
            data: {
                "pageindex": pageIndex,
                "pagesize": pageSize,
                "depid": departmentId
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_Error);
                } else {
                    callback(result, initUserVal);

                }
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_Error);
            },
            dataType: "json",
        });
    }

    initUserSelect(result, initUserVal) {
        var rows = result.result.rows;
        var html = "";
        var userSelectObj = $("select.username");
        var template = userSelectObj.find("#usertemplate").text().trim();
        for (var i = 0, length = rows.length; i < length; i++) {
            var userName = rows[i].username;
            if (userName != "管理员") {
                var userId = rows[i].userid;
                var data = [userId, userName];
                var index = 0;
                var replaceTemplate = template.replace(/%data/g, function () {
                    return (index < data.length) ? (data[index++]) : "";
                })
                html += replaceTemplate
            }
        }
        userSelectObj.append(html);
        if (initUserVal !== null) {
            $("select.username option[value='" + initUserVal + "']").attr("selected", "selected");
        }
    }


    //获取请假类型列表
    requestVacationTypeList(pageIndex, pageSize, initVal) {
        var config = this.config.requestVacationTypeList;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_Request,
            data: {
                "pageindex": pageIndex,
                "pagesize": pageSize,
                "key": config.Keyconfig,
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_Error);
                } else {
                    var rows = result.result.rows;
                    var html = "";
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var vacationTypeID = rows[i].id;
                        var vacationTypeName = rows[i].value;
                        html += "<option value='" + vacationTypeID + "'>" + vacationTypeName + "</option>"
                    }
                    $("select.vacationtype").append(html);
                    if (initVal !== null) {
                        $("select.vacationtype").val(initVal);
                    }



                }
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_Error);
            },
            dataType: "json",
        });
    }


    //checkbox全选回调函数
    selecteAll(event) {
        var checked = $(event.currentTarget).prop("checked");
        if (checked === true) {
            this.domObj.find(" .list-content tbody input").prop("checked", true);
            this.domObj.find(".list-content tbody tr").addClass("success");
            this.domObj.find(".list-content tbody tr").attr("choosed", "yes");
        } else {
            this.domObj.find(" .list-content tbody input").prop("checked", "");
            this.domObj.find(" .list-content tbody tr").removeClass("success");
            this.domObj.find(".list-content tbody tr").attr("choosed", "no");
        }
    }



    //列表项全选
    selecteItem(event) {
        var state = $(event.currentTarget).attr("choosed");
        if (state === "no") {
            $(event.currentTarget).addClass("success");
            $(event.currentTarget).attr("choosed", "yes");
            $(event.currentTarget).find("td input").prop("checked", true);
        } else {
            $(event.currentTarget).removeClass("success");
            $(event.currentTarget).attr("choosed", "no");
            $(event.currentTarget).find("td input").prop("checked", false);
        }
    }

    //新增假期类型
    addVacationType(userID, vacationTypeID, startDate, endDate, notes, createUser) {
        var config = this.config.addVacationType;
        var toast = this.AppX.runtimeConfig.toast;
        //验证必填项
        if (userID == "" || vacationTypeID == "" || startDate == "" || endDate == "") {
            this.popup.ShowTip(config.MSG_confirm);
            return;
        }
        //
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "userid": userID,
                "sys_id": vacationTypeID,
                "notes": notes,
                "start_date": startDate,
                "end_date": endDate,
                "create_user": createUser
            },
            success: function (result) {
                if (result.code !== 1) {
                    this.popup.ShowTip(config.MSG_error);
                } else {
                    this.popup.Close();
                    toast.Show(config.MSG_success);
                    this.requestWorkerVacationInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
                }
            }.bind(this),
            error: function () {
                this.popup.ShowTip(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //删除员工请假
    deleteVacationType(buildeSiteId: Array<any>) {
        var config = this.config.deleteVacationType;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "list": buildeSiteId
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else {
                    toast.Show(config.MSG_success);
                    this.requestWorkerVacationInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
                }
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //修改员工请假
    modifyVacationType(ID, userID, vacationTypeID, startDate, endDate, notes) {
        var config = this.config.modifyVacationType;
        var toast = this.AppX.runtimeConfig.toast;
        //验证必填项
        if (userID == "" || vacationTypeID == "" || startDate == "" || endDate == "") {
            this.popup.ShowTip(config.MSG_confirm);
            return;
        }
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "id": ID,
                "userid": userID,
                "sys_id": vacationTypeID,
                "notes": notes,
                "start_date": startDate,
                "end_date": endDate
            },
            success: function (result) {
                if (result.code !== 1) {
                    this.popup.ShowTip(config.MSG_error);
                } else {
                    this.popup.Close();
                    toast.Show(config.MSG_success);
                    this.requestWorkerVacationInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
                }
            }.bind(this),
            error: function () {
                this.popup.ShowTip(config.MSG_error);
            },
            dataType: "json",
        });
    }
}