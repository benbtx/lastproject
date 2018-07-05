import BaseWidget = require('core/BaseWidget.class');
export = XJVacationType;

class XJVacationType extends BaseWidget {
    baseClass = "widget-XJVacationType";


    popup;//
    pageIndex;//当前显示的为第几页
    pageSize;//每页显示的条数
    absenceTypeLis = [];//当页的所有请假类型列表


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
        this.pageIndex = this.config.requestVacationTypeInfo.Count_pageindex;
        this.pageSize = this.config.requestVacationTypeInfo.Count_pagesize;
        this.initEvent();

    }

    initEvent() {
        //获取所有的请假类型
        this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
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
        //每页显示数目重设
        this.domObj.find(".list-pagetool select.dynamic_pagesize").bind("change", function (event) {
            var pageSize = $(event.currentTarget).find("option:selected").val();
            this.pageIndex = 1;
            this.pageSize = pageSize;
            this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
        }.bind(this))
    }

    //上一页
    prePage() {
        var pageIndex = parseInt(this.domObj.find(".list-pagetool button.current span.currentpage").text());
        var prePage = pageIndex - 1;
        if (prePage < 1) {
            return;
        } else {
            this.pageIndex = prePage;
            this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
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
            this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
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
            this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
        }
    }

    //增、删、改等按钮点击事件
    toolbarClick(event) {
        var handleType = $(event.currentTarget).attr("handletype");
        if (handleType === "add") {
            this.popup.setSize(600, 350);
            var Obj = this.popup.Show("节假日类型", this.template.split('$$')[1]);
            Obj.conObj.find(".vacationtypename").focus();
            Obj.conObj.find("form").bootstrapValidator();
            Obj.submitObj.off("click").on("click", function () {
                var vacationTypeName = Obj.conObj.find('.vacationtypename').val();
                var buildSiteDescription = Obj.conObj.find('.vacationtypedescription').val();
                this.addVacationType(vacationTypeName, buildSiteDescription).bind(this);
            }.bind(this));
        } else if (handleType === "modify") {
            var selctedItem = this.domObj.find(".list-content tbody input:checked");
            if (selctedItem.length === 0) {
                this.AppX.runtimeConfig.toast.Show("请选择要修改的假期类型！");
            } else if (selctedItem.length > 1) {
                this.AppX.runtimeConfig.toast.Show("只能修改单条记录！");
            } else {
                var selectRow = selctedItem.parents("tr");
                var buildeSiteID = selctedItem.attr("buildsiteid");
                var name = selectRow.children("td.name").text();
                var description = selectRow.children("td.description").text();
                this.popup.setSize(600, 350);
                var Obj = this.popup.Show("修改假期类型", this.template.split('$$')[2]);
                Obj.conObj.find(".vacationtypename").focus();
                Obj.conObj.find("form").bootstrapValidator();
                Obj.conObj.find('.vacationtypename').val(name);
                Obj.conObj.find('.vacationtypedescription').val(description);
                //提交按钮事件
                Obj.submitObj.off("click").on("click", function (event) {
                    var name = Obj.conObj.find('.vacationtypename').val();
                    var description = Obj.conObj.find('.vacationtypedescription').val();
                    this.modifyVacationType(buildeSiteID, name, description);
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
            this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
        }
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

    requestVacationTypeInfo(pageIndex, pageSize, name, callback) {
        var config = this.config.requestVacationTypeInfo;
        var toast = this.AppX.runtimeConfig.toast;
        //清除原有数据、分页数据、显示加载数据动画
        this.absenceTypeLis = [];
        this.domObj.find(".list-content tbody tr").remove();
        this.domObj.find(".list-pagetool .total").text("-");
        this.domObj.find(".list-pagetool  .pagesize").text("-");
        this.domObj.find(".list-pagetool  span.totalpage").text("-");
        this.domObj.find(".list-pagetool  span.currentpage").text("-");
        this.domObj.find(".list-content div.dataloader").css('display', "block");
        //请求数据
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "key": config.Keyconfig,
                "pageindex": pageIndex,
                "pagesize": pageSize

            },
            success: function (result) {
                this.absenceTypeLis = [];
                this.domObj.find(".list-content div.dataloader").css('display', "none");
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else if (result.result.rows.length === 0) {
                    toast.Show(config.MSG_null);
                } else {
                    var rows = result.result.rows;
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var id = rows[i].id;//唯一标识
                        var name = rows[i].value;//请假类型
                        var notes = rows[i].notes;//备注
                        var creatTime = rows[i].create_time;//创建时间
                        var absenceType = new AbsenceType(id, name, notes, creatTime);
                        this.absenceTypeLis.push(absenceType);
                    }
                    //初始化列表分页信息
                    var total = result.result.total;//总记录数
                    var pageSize = result.result.pagesize || 20;//每页显示几条
                    var pageIndex = result.result.pageindex || 1;//第几页
                    var totalPage = Math.ceil(parseInt(total) / parseInt(pageSize));//总页数
                    this.domObj.find(".list-pagetool .total").text(total);
                    this.domObj.find(".list-pagetool  .pagesize").text(pageSize);
                    this.domObj.find(".list-pagetool  span.totalpage").text(totalPage);
                    this.domObj.find(".list-pagetool  span.currentpage").text(pageIndex);
                    //初始化内容
                    callback(this.absenceTypeLis);
                }
            }.bind(this),
            error: function (error) {
                this.domObj.find(".list-content div.dataloader").css('display', "none");
                toast.Show(config.MSG_error);
            }.bind(this),
            dataType: "json",
        });
    }

    //初始化假期类型列表
    initVacationTypeList(absenceTypeLis: Array<AbsenceType>) {
        // var rows = result.rows;
        var template = this.domObj.find(".list-content  tbody #template").text().trim();
        var html = "";
        var data = [];
        for (var i = 0, length = absenceTypeLis.length; i < length; i++) {

            data = absenceTypeLis[i].getWidgetData();
            var index = 0;
            var templateRepalce = template.replace(/%[a-zA-Z]+%/g, function () {
                return (index < data.length) ? (data[index++]) : '';
            });
            html += templateRepalce;
        }
        this.domObj.find(".list-content tbody").append(html);

        //每一条记录点击事件绑定
        this.domObj.find(".list-content tbody tr").bind("click", this.selecteItem.bind(this));
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
    addVacationType(vacationTypeName, buildSiteDescription) {
        var config = this.config.addVacationType;
        var toast = this.AppX.runtimeConfig.toast;
        //验证必填项
        if (vacationTypeName == "") {
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
                "key": config.Keyconfig,
                "value": vacationTypeName,
                "notes": buildSiteDescription
            },
            success: function (result) {
                if (result.code !== 1) {
                    this.popup.ShowTip(config.MSG_error);
                } else {
                    this.popup.Close();
                    toast.Show(config.MSG_success);
                    this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
                }
            }.bind(this),
            error: function () {
                this.popup.ShowTip(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //删除假期类型
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
                    toast.Show(result.message);
                } else {
                    toast.Show(config.MSG_success);
                    this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
                }
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //修改假期类型
    modifyVacationType(buildeSiteId, name, description) {
        var config = this.config.modifyVacationType;
        var toast = this.AppX.runtimeConfig.toast;
        if (name == "") {
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
                "id": buildeSiteId,
                "key": config.Keyconfig,
                "value": name,
                "notes": description
            },
            success: function (result) {
                if (result.code !== 1) {
                    this.popup.ShowTip(config.MSG_error);
                } else {
                    this.popup.Close();
                    toast.Show(config.MSG_success);
                    this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
                }
            }.bind(this),
            error: function () {
                this.popup.ShowTip(config.MSG_error);
            },
            dataType: "json",
        });
    }
}

class AbsenceType {
    id: string;//唯一 标识
    name: string; //请假类型
    notes: string;//备注
    creatTime: string;//创建时间

    constructor(id, name, notes, creatTime) {
        this.id = id;
        this.name = name;
        this.notes = notes;
        this.creatTime = creatTime;
    }
    public getWidgetData() {
        var data = [this.id, this.name, this.notes, this.creatTime];
        return data;
    }
}

class AbsenceTypeList {
    public addAbsenceType() {

    }
}