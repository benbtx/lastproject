import BaseWidget = require('core/BaseWidget.class');
export = XJWatchingSettingManagement;

class XJWatchingSettingManagement extends BaseWidget {
    baseClass = "widget-XJWatchingSettingManagement";

    popup;//
    pageIndex;//当前显示的为第几页
    pageSize;//每页显示的条数
    tableList = [];




    startup() {
        this.initHtml();

    }
    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")();
        this.setHtml(html);
        this.ready();

        this.XJWatchingSettingManagementInit();


    }

    destroy() {

        this.domObj.remove();
        this.afterDestroy();
    }

    XJWatchingSettingManagementInit() {
        this.popup = this.AppX.runtimeConfig.popup;
        this.initEvent();
        this.pageIndex = this.config.page.pagesize;
        this.pageSize = this.config.page.pageindex;


    }
    initEvent() {
        //工具点击事件
        this.domObj.find(".list-tool button.toolbar").bind("click", this.toolbarClick.bind(this));
        //checkbox 全选事件
        this.domObj.find(".list-content  thead input").bind("click", this.selecteAll.bind(this));
        //
        this.requestWatchingSettingInfo(this.pageIndex, this.pageSize, "", this.initWatchingSettingList.bind(this));
        //上一页请求事件
        this.domObj.find(".list-pagetool button.pre").bind("click", this.prePage.bind(this));
        //下一页请求事件
        this.domObj.find(".list-pagetool button.next").bind("click", this.nextPage.bind(this));
        //跳转请求事件
        this.domObj.find(".list-pagetool button.pageturning").bind("click", this.goPage.bind(this));
        this.domObj.find(".list-pagetool select.dynamic_pagesize").bind("change", function (event) {
            var pageSize = $(event.currentTarget).find("option:selected").val();
            this.pageIndex = 1;
            this.pageSize = pageSize;
            this.requestWatchingSettingInfo(this.pageIndex, this.pageSize, "", this.initWatchingSettingList.bind(this));
        }.bind(this))


    }

    requestWatchingSettingInfo(pageIndex, pageSize, state, callback) {
        var config = this.config.requestWatchingSettingInfo;
        var toast = this.AppX.runtimeConfig.toast;
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
                "state": state
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else if (result.result.rows.length === 0) {
                    toast.Show(config.MSG_null);
                } else {
                    var watchingSettings = [];
                    var rows = result.result.rows;
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var id = rows[i].id;
                        var name = rows[i].name;
                        var refreshTimeSpan = rows[i].refresh_internal;
                        var pathLineColor = rows[i].trail_line_color;
                        var pathLineWidth = rows[i].trail_line_width;
                        var pathPointColor = rows[i].trail_point_color;
                        var pathPointWidth = rows[i].trail_point_width;
                        var state = rows[i].state;
                        var watchingSettingItem = new WatchingSetting(id, name, refreshTimeSpan, pathLineColor, pathLineWidth, pathPointColor, pathPointWidth, state);
                        watchingSettings.push(watchingSettingItem);
                    }
                    //初始化表的内容
                    this.initWatchingSettingList(watchingSettings);
                    var total = result.result.total;//总记录数
                    var pageSize = result.result.pagesize || 20;//每页显示几条
                    var pageIndex = result.result.pageindex || 1;//第几页
                    var totalPage = Math.ceil(parseInt(total) / parseInt(pageSize));//总页数
                    this.domObj.find(".list-pagetool .pagecontrol .total").text(total);
                    this.domObj.find(" .list-pagetool .pagecontrol .pagesize").text(pageSize);
                    this.domObj.find(".list-pagetool  span.totalpage").text(totalPage);
                    this.domObj.find(".list-pagetool  span.currentpage").text(pageIndex);
                }
            }.bind(this),
            error: function (error) {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //初始化监控端设置列表
    initWatchingSettingList(watchingSettings: Array<WatchingSetting>) {
        //清除之前的列表项  
        this.domObj.find(".list-content tbody tr").remove();
        var template = this.domObj.find(".list-content tbody #template").text().trim();
        var html = "";
        for (var i = 0, length = watchingSettings.length; i < length; i++) {
            var data = watchingSettings[i].getAttribute();
            var index = 0;
            var templateRepalce = template.replace(/%data/g, function () {
                return (index < data.length) ? (data[index++]) : '';
            });
            html += templateRepalce;
        }
        this.domObj.find(".list-content tbody").append(html);
        //每一条记录点击事件绑定
        this.domObj.find(".list-content  tbody tr").bind("click", this.selecteItem.bind(this));
    }

    //上一页
    prePage() {
        var pageIndex = parseInt(this.domObj.find(".list-pagetool button.current span.currentpage").text());
        var prePage = pageIndex - 1;
        if (prePage < 1) {
            return;
        } else {
            this.pageIndex = prePage;
            this.requestWatchingSettingInfo(this.pageIndex, this.pageSize, "", this.initWatchingSettingList.bind(this));
        }
    }
    //下一页
    nextPage() {
        var pageIndex = parseInt(this.domObj.find(" .list-pagetool button.current span.currentpage").text());
        var totalPage = parseInt(this.domObj.find(" .list-pagetool button.current span.totalpage").text());
        var nextPage = pageIndex + 1;
        if (nextPage > totalPage) {
            return;
        } else {
            this.pageIndex = nextPage;
            this.requestWatchingSettingInfo(this.pageIndex, this.pageSize, "", this.initWatchingSettingList.bind(this));
        }
    }

    //跳转到另外一页
    goPage() {
        var pageIndex = parseInt(this.domObj.find(".list-pagetool div.go input.currpage").val());
        var totalPage = parseInt(this.domObj.find(" .list-pagetool button.current span.totalpage").text());
        var goPage = pageIndex;
        if (goPage > totalPage || goPage < 1) {
            return;
        } else {
            this.pageIndex = goPage;
            this.requestWatchingSettingInfo(this.pageIndex, this.pageSize, "", this.initWatchingSettingList.bind(this));
        }
    }

    //
    toolbarClick(event) {
        var handleType = $(event.currentTarget).attr("handletype");
        if (handleType === "add") {
            this.popup.setSize(600, 400);
            var Obj = this.popup.Show("新增监控配置", this.template.split('$$')[1]);
            Obj.submitObj.off("click").on("click", function () {
                var name = Obj.conObj.find('input.name').val();
                var refreshTimeSpan = Obj.conObj.find('input.refreshtimespan').val();
                var pathLineColor = Obj.conObj.find('input.pathlinecolor').val();
                var pathLineWith = Obj.conObj.find('input.pathlinewidth').val();
                var pathPointColor = Obj.conObj.find('input.pathpointcolor').val();
                var pathPointWidth = Obj.conObj.find('input.pathpointwidth').val();
                var watchingSettingItem = new WatchingSetting("", name, refreshTimeSpan, pathLineColor, pathLineWith, pathPointColor, pathPointWidth, "");
                this.addWatchingSetting(watchingSettingItem).bind(this);
            }.bind(this));
        } else if (handleType === "delete") {
            var selctedItem = this.domObj.find(" div.list-content tbody input:checked");
            if (selctedItem.length === 0) {
                this.AppX.runtimeConfig.toast.Show("请选择要删除的监控配置！");
            } else {

                this.popup.setSize(300, 150);
                var Obj = this.popup.ShowMessage("提示", "确认需删除选择数据？");
                Obj.submitObj.off("click").on("click", function () {
                    this.popup.Close();
                    selctedItem.parents("tr").remove();
                    var settingID = [];
                    selctedItem.parents("tr").attr("settingid", function (index, val) {
                        settingID.push(val);
                        return val;
                    });
                    this.deleteWatchingSetting(settingID);
                }.bind(this));

            }
        } else if (handleType === "assgin") {
            var selctedItem = this.domObj.find("div.list-content tbody input:checked");
            if (selctedItem.length === 0) {
                this.AppX.runtimeConfig.toast.Show("请选择要启用的监控配置！");
            } else if (selctedItem.length > 1) {
                this.AppX.runtimeConfig.toast.Show("请选择单条数据！");
            } else {

                this.popup.setSize(300, 150);
                var Obj = this.popup.ShowMessage("提示", "确认需启用选择数据？");
                Obj.submitObj.off("click").on("click", function () {
                    this.popup.Close();
                    var settingID = selctedItem.parents("tr").attr("settingid");
                    this.assignWatchingSetting(settingID);
                }.bind(this));

            }
        } else if (handleType === "refresh") {
            this.requestWatchingSettingInfo(this.pageIndex, this.pageSize, "", this.initWatchingSettingList.bind(this));
        }
    }

    //checkbox全选回调函数
    selecteAll(event) {
        var checked = $(event.currentTarget).prop("checked");
        if (checked === true) {
            this.domObj.find(".list-content tbody input").prop("checked", true);
            this.domObj.find(".list-content tbody tr").addClass("success");
            this.domObj.find(".list-content tbody tr").attr("choosed", "yes");
        } else {
            this.domObj.find(".list-content tbody input").prop("checked", "");
            this.domObj.find(".list-content tbody tr").removeClass("success");
            this.domObj.find(".list-content tbody tr").attr("choosed", "no");
        }
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

    //新增监控配置
    addWatchingSetting(watchingSettingItem: WatchingSetting) {
        var config = this.config.addWatchingSetting;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "name": watchingSettingItem.name,
                "refresh_internal": watchingSettingItem.refreshTimeSpan,
                "trail_line_color": watchingSettingItem.pathLineColor,
                "trail_line_width": watchingSettingItem.pathLineWith,
                "trail_point_color": watchingSettingItem.pathPointColor,
                "trail_point_width": watchingSettingItem.pathPointWith
            },
            success: function (result) {
                if (result.code !== 1) {
                    this.popup.ShowTip(config.MSG_error);
                } else {
                    this.popup.Close();
                    toast.Show(config.MSG_success);
                    this.requestWatchingSettingInfo(this.pageIndex, this.pageSize, "", this.initWatchingSettingList.bind(this));
                }
            }.bind(this),
            error: function () {
                this.popup.ShowTip(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //删除监控配置
    deleteWatchingSetting(settingID: Array<any>) {
        var config = this.config.deleteWatchingSetting;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "list": settingID
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else {
                    toast.Show(config.MSG_success);
                    this.requestWatchingSettingInfo(this.pageIndex, this.pageSize, "", this.initWatchingSettingList.bind(this));
                }
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }
    //启用监控配置
    assignWatchingSetting(settingID: string) {
        var config = this.config.assignWatchingSetting;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request + "/" + settingID,
            data: {
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else {
                    toast.Show(config.MSG_success);
                    this.requestWatchingSettingInfo(this.pageIndex, this.pageSize, "", this.initWatchingSettingList.bind(this));
                }
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });

    }
}

/*监控设置类 */
class WatchingSetting {
    id: string;//标识id
    name: string; //监控设置名称，类似于主题名称
    refreshTimeSpan: string;//刷新间隔
    pathLineColor: string;//轨迹线颜色
    pathLineWith: string;//轨迹线宽度
    pathPointColor: string;//轨迹点颜色
    pathPointWith: string;//轨迹点宽度
    state: string;//启用状态{0，停用；1，启用}
    deleteState: string;//删除状态（0:可以删除；1：不可删除），1主要为默认值。
    constructor(id, name, refreshTimeSpan, pathLineColor, pathLineWith, pathPointColor, pathPointWith, state) {
        this.id = id;
        this.name = name;
        this.refreshTimeSpan = refreshTimeSpan;
        this.pathLineColor = pathLineColor;
        this.pathLineWith = pathLineWith;
        this.pathPointColor = pathPointColor;
        this.pathPointWith = pathPointWith;
        this.state = state;
    }

    public getAttribute() {
        var data = [this.id, this.state, this.name, this.refreshTimeSpan, this.pathLineColor, this.pathLineWith, this.pathPointColor, this.pathPointWith]
        return data;
    }
}