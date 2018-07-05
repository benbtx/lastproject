import BaseWidget = require('core/BaseWidget.class');
export = XJBuildingSiteType;

class XJBuildingSiteType extends BaseWidget {
    baseClass = "widget-XJBuildingSiteType";


    popup;//
    pageIndex;//当前显示的为第几页
    pageSize;//每页显示的条数


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
        this.pageIndex = this.config.requestBuildSiteTypeInfo.Count_pageindex;
        this.pageSize = this.config.requestBuildSiteTypeInfo.Count_pagesize;
        this.initEvent();

    }
    initEvent() {
        //查询事件
        this.domObj.find(".XJBuildingSiteType-tool span.searchbutton").bind("click", this.searchClick.bind(this));
        //checkbox 全选事件
        this.domObj.find("#maincontent thead input").bind("click", this.selecteAll.bind(this));
        //工具点击事件
        this.domObj.find("#toolbar button.toolbar").bind("click", this.toolbarClick.bind(this));
        //上一页请求事件
        this.domObj.find(".div-pagetool button.pre").bind("click", this.prePage.bind(this));
        //下一页请求事件
        this.domObj.find(".div-pagetool button.next").bind("click", this.nextPage.bind(this));
        //跳转请求事件
        this.domObj.find(".div-pagetool button.pageturning").bind("click", this.goPage.bind(this));
        this.domObj.find(".div-pagetool select.dynamic_pagesize").bind("change", function (event) {
            var pageSize = $(event.currentTarget).find("option:selected").val();
            this.pageIndex = 1;
            this.pageSize = pageSize;
            this.requestBuildSiteTypeInfo(this.pageIndex, this.pageSize, "", this.initBuildSiteTypeList.bind(this));
        }.bind(this))
        //
        this.requestBuildSiteTypeInfo(this.pageIndex, this.pageSize, "", this.initBuildSiteTypeList.bind(this));
       
        //enter查询
        this.domObj.find('.search_condition').keydown(function (event) {
            if (event.keyCode == 13) {//enter
                this.domObj.find(".XJBuildingSiteType-tool span.searchbutton").trigger("click");
            }
        }.bind(this));

    }

    //查询事件
    searchClick(event) {
        var buildeSiteTypeName = this.domObj.find("input.buildsitetypename").val();
        this.requestBuildSiteTypeInfo(this.pageIndex, this.pageSize, buildeSiteTypeName, this.initBuildSiteTypeList.bind(this));

    }

    //上一页
    prePage() {
        var pageIndex = parseInt(this.domObj.find(".div-pagetool button.current span.currentpage").text());
        var prePage = pageIndex - 1;
        if (prePage < 1) {
            return;
        } else {
            this.pageIndex = prePage;
            this.requestBuildSiteTypeInfo(this.pageIndex, this.pageSize, "", this.initBuildSiteTypeList.bind(this));
        }
    }
    //下一页
    nextPage() {
        var pageIndex = parseInt(this.domObj.find(".div-pagetool button.current span.currentpage").text());
        var totalPage = parseInt(this.domObj.find(".div-pagetool button.current span.totalpage").text());
        var nextPage = pageIndex + 1;
        if (nextPage > totalPage) {
            return;
        } else {
            this.pageIndex = nextPage;
            this.requestBuildSiteTypeInfo(this.pageIndex, this.pageSize, "", this.initBuildSiteTypeList.bind(this));
        }
    }

    //跳转到另外一页
    goPage() {
        var pageIndex = parseInt(this.domObj.find(".div-pagetool div.go input.currpage").val());
        var totalPage = parseInt(this.domObj.find(" .div-pagetool button.current span.totalpage").text());
        var goPage = pageIndex;
        if (goPage > totalPage || goPage < 1) {
            return;
        } else {
            this.pageIndex = goPage;
            this.requestBuildSiteTypeInfo(this.pageIndex, this.pageSize, "", this.initBuildSiteTypeList.bind(this));
        }
    }

    //新增、修改、删除、刷新操作
    toolbarClick(event) {
        var handleType = $(event.currentTarget).attr("handletype");
        if (handleType === "add") {
            this.popup.setSize(600, 350);
            var Obj = this.popup.Show("新增工地类型", this.template.split('$$')[1]);
            $("#addbuildsitetype input").focus();
            $("#addbuildsitetype form ").bootstrapValidator({
                "message": "该值无效",
                "feedbackIcons": {
                    valid: "glyphicon glyphicon-ok",
                    invalid: "glyphicon glyphicon-remove",
                    validating: "glyphicon glyphicon-refresh"
                },
                fields: {
                    buildtypename: {
                        message: "用户验证失败",
                        trigger: "blur",
                        validators: {
                            notEmpty: {
                                message: "值不能为空"
                            }
                        }
                    }
                }
            });
            Obj.submitObj.off("click").on("click", function () {
                var buildSiteName = Obj.conObj.find('.buildsitetypename').val();
                var buildSiteDescription = Obj.conObj.find('.buildsitetypedescription').val();
                this.addBuildSiteType(buildSiteName, buildSiteDescription);
            }.bind(this));
        } else if (handleType === "modify") {
            var selctedItem = $(".widget-XJBuildingSiteType #maincontent tbody input:checked");
            if (selctedItem.length === 0) {
                this.AppX.runtimeConfig.toast.Show("请选择要修改的工地类型！");
            } else if (selctedItem.length > 1) {
                this.AppX.runtimeConfig.toast.Show("只能修改单条记录！");
            } else {
                var selectRow = selctedItem.parents("tr");
                var buildeSiteID = selctedItem.attr("buildsiteid");
                var name = selectRow.children("td.name").text();
                var description = selectRow.children("td.description").text();
                this.popup.setSize(600, 350);
                var Obj = this.popup.Show("修改工地类型", this.template.split('$$')[2]);
                $("#modifybuildsitetype form ").bootstrapValidator({
                    "message": "修改无效",
                    "feedbackIcons": {
                        valid: "glyphicon glyphicon-ok",
                        invalid: "glyphicon glyphicon-remove",
                        validating: "glyphicon glyphicon-refresh"
                    },
                    fields: {
                        buildtypename: {
                            message: "用户验证失败",
                            trigger: "blur",
                            validators: {
                                notEmpty: {
                                    message: "值不能为空"
                                }
                            }
                        }
                    }
                });
                $("#modifybuildsitetype input").focus();
                Obj.conObj.find('.buildsitetypename').val(name);
                Obj.conObj.find('.buildsitetypedescription').val(description);
                //提交按钮事件
                Obj.submitObj.off("click").on("click", function (event) {
                    var name = Obj.conObj.find('.buildsitetypename').val();
                    var description = Obj.conObj.find('.buildsitetypedescription').val();
                    this.modifyBuildSiteType(buildeSiteID, name, description);
                }.bind(this));
            }

        } else if (handleType === "delete") {
            var selctedItem = $(".widget-XJBuildingSiteType #maincontent tbody input:checked");
            if (selctedItem.length === 0) {
                this.AppX.runtimeConfig.toast.Show("请选择要删除的工地类型！");
            } else {

                this.popup.setSize(300, 150);
                var Obj = this.popup.ShowMessage("提示", "确认需删除选择数据？");
                Obj.submitObj.off("click").on("click", function () {
                    this.popup.Close();
                    // selctedItem.parents("tr").remove();

                    var buildeSiteId = [];
                    selctedItem.attr("buildsiteid", function (index, val) {
                        buildeSiteId.push(val);
                        return val;
                    });
                    this.deleteBuildSiteType(buildeSiteId);
                }.bind(this));

            }
        } else if (handleType === "refresh") {
            this.requestBuildSiteTypeInfo(this.pageIndex, this.pageSize, "", this.initBuildSiteTypeList.bind(this));
        }
    }

    //checkbox全选回调函数
    selecteAll(event) {
        var checked = $(event.currentTarget).prop("checked");
        if (checked === true) {
            this.domObj.find(" #maincontent tbody input").prop("checked", true);
            this.domObj.find("#maincontent tbody tr").addClass("success");
            this.domObj.find("#maincontent tbody tr").attr("choosed", "yes");
        } else {
            this.domObj.find(" #maincontent tbody input").prop("checked", "");
            this.domObj.find(" #maincontent tbody tr").removeClass("success");
            this.domObj.find(" #maincontent tbody tr").attr("choosed", "no");
        }
    }

    requestBuildSiteTypeInfo(pageIndex, pageSize, name, callback) {
        var config = this.config.requestBuildSiteTypeInfo;
        var toast = this.AppX.runtimeConfig.toast;
        this.domObj.find(".buildsitecontent tbody tr").remove();
        this.domObj.find(".div-pagetool .pagecontrol .total").text("-");
        this.domObj.find(" .div-pagetool .pagecontrol .pagesize").text("-");
        this.domObj.find(".div-pagetool  span.totalpage").text("-");
        this.domObj.find(".div-pagetool  span.currentpage").text("-");
        this.domObj.find("div.dataloader").css("display", "block");
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "pageindex": pageIndex,
                "pagesize": pageSize,
                "name": name
            },
            success: function (result) {
                this.domObj.find("div.dataloader").css("display", "none");
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else if (result.result.rows.length === 0) {
                    toast.Show(config.MSG_null);
                } else {
                    callback(result.result);
                }
            }.bind(this),
            error: function () {
                this.domObj.find("div.dataloader").css("display", "none");
                toast.Show(config.MSG_error);
            }.bind(this),
            dataType: "json",
        });
    }

    //初始化工地类型列表
    initBuildSiteTypeList(result) {
        var rows = result.rows;
        //清除之前的列表项  
        this.domObj.find(".buildsitecontent tbody tr").remove();
        var template = this.domObj.find(" .buildsitecontent tbody #template").text().trim();
        var html = "";
        var data = [];
        for (var i = 0, length = rows.length; i < length; i++) {
            var id = rows[i].id;
            var creatTime = rows[i].create_time;
            var name = rows[i].name;
            var description = rows[i].notes;
            data = [id, name, description, creatTime];
            var index = 0;
            var templateRepalce = template.replace(/%[a-zA-Z]+%/g, function () {
                return (index < data.length) ? (data[index++]) : '';
            });
            html += templateRepalce;
        }
        this.domObj.find(" .buildsitecontent tbody").append(html);
        //
        var total = result.total;//总记录数
        var pageSize = result.pagesize || 20;//每页显示几条
        var pageIndex = result.pageindex || 1;//第几页
        var totalPage = Math.ceil(parseInt(total) / parseInt(pageSize));//总页数
        this.domObj.find(".div-pagetool .pagecontrol .total").text(total);
        this.domObj.find(" .div-pagetool .pagecontrol .pagesize").text(pageSize);
        this.domObj.find(".div-pagetool  span.totalpage").text(totalPage);
        this.domObj.find(".div-pagetool  span.currentpage").text(pageIndex);
        //每一条记录点击事件绑定
        this.domObj.find(" #maincontent tbody tr").bind("click", this.selecteItem.bind(this));
    }

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

    //新增工地类型
    addBuildSiteType(buildSiteName, buildSiteDescription) {
        var config = this.config.addBuildSiteType;
        var toast = this.AppX.runtimeConfig.toast;
        if (buildSiteName == "") {
            this.popup.ShowTip("工地类型名称不能为空！");
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
                "name": buildSiteName,
                "notes": buildSiteDescription
            },
            success: function (result) {
                if (result.code !== 1) {
                    this.popup.ShowTip(config.MSG_error);
                } else {
                    this.popup.Close();
                    toast.Show(config.MSG_success);
                    this.requestBuildSiteTypeInfo(this.pageIndex, this.pageSize, "", this.initBuildSiteTypeList.bind(this));
                }
            }.bind(this),
            error: function () {
                this.popup.ShowTip(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //删除工地类型
    deleteBuildSiteType(buildeSiteId: Array<any>) {
        var config = this.config.deleteBuildSiteType;
        var toast = this.AppX.runtimeConfig.toast;
        for (var i = 0, length = buildeSiteId.length; i < length; i++) {
            var count = 0;//回调函数计算器
            $.ajax({
                headers: {
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request + "/" + buildeSiteId[i],
                data: {
                },
                success: function (result) {
                    if (result.code !== 1) {
                        toast.Show(result.message);
                    } else {
                        count++;
                        if (count === length) {
                            toast.Show(config.MSG_success);
                            this.domObj.find("#maincontent thead input").prop("checked", false);
                            this.requestBuildSiteTypeInfo(this.pageIndex, this.pageSize, "", this.initBuildSiteTypeList.bind(this));
                        }

                    }
                }.bind(this),
                error: function () {
                    toast.Show(config.MSG_error);
                },
                dataType: "json",
            });
        }
    }

    //修改工地类型
    modifyBuildSiteType(buildeSiteId, name, description) {
        var config = this.config.modifyBuildSiteType;
        var toast = this.AppX.runtimeConfig.toast;
        if (name == "") {
            this.popup.ShowTip("工地类型名称不能为空！");
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
                "name": name,
                "notes": description
            },
            success: function (result) {
                if (result.code !== 1) {
                    this.popup.ShowTip(config.MSG_error);
                } else {
                    this.popup.Close();
                    toast.Show(config.MSG_success);
                    this.requestBuildSiteTypeInfo(this.pageIndex, this.pageSize, "", this.initBuildSiteTypeList.bind(this));
                }
            }.bind(this),
            error: function () {
                this.popup.ShowTip(config.MSG_error);
            },
            dataType: "json",
        });
    }



}