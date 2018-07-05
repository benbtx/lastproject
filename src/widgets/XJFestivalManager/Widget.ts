import BaseWidget = require('core/BaseWidget.class');
export = XJFestivalManager;

class XJFestivalManager extends BaseWidget {
    baseClass = "widget-XJFestivalManager";


    popup;//
    pageIndex;//当前显示的为第几页
    pageSize;//每页显示的条数
    festivalList = [];//节假日安排列表


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
        $(".calendar-context-menu").remove();
    }

    XJBuildingSiteTypeInit() {
        this.popup = this.AppX.runtimeConfig.popup;
        this.pageIndex = this.config.requestVacationTypeInfo.Count_pageindex;
        this.pageSize = this.config.requestVacationTypeInfo.Count_pagesize;
        this.initEvent();


    }


    initEvent() {
        this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initFestivalArrayCalendar.bind(this));
        // //checkbox 全选事件
        // this.domObj.find("#maincontent thead input").bind("click", this.selecteAll.bind(this));
        // //工具点击事件
        // this.domObj.find(" #toolbar button.toolbar").bind("click", this.toolbarClick.bind(this));
        // //上一页请求事件
        // this.domObj.find(".div-pagetool button.pre").bind("click", this.prePage.bind(this));
        // //下一页请求事件
        // this.domObj.find(".div-pagetool button.next").bind("click", this.nextPage.bind(this));
        // //跳转请求事件
        // this.domObj.find(" .div-pagetool button.pageturning").bind("click", this.goPage.bind(this));
        //  //
        // this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));

    }

    requestVacationTypeInfo(pageIndex, pageSize, year, callback) {
        var config = this.config.requestVacationTypeInfo;
        var toast = this.AppX.runtimeConfig.toast;
        this.festivalList = [];
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
                "year": year

            },
            success: function (result) {
                this.festivalList = [];
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else if (result.result.rows.length === 0) {
                    callback(this.festivalList);
                } else {
                    var rows = result.result.rows;
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var id = rows[i].id;//节日台账ID
                        var name = rows[i].name;//节日名称
                        var startDate = rows[i].start_date;//节日开始时间
                        var endDate = rows[i].end_date;//节日结束实际
                        var notes = rows[i].notes;//备注
                        var createUser = rows[i].create_user;//创建人
                        var createTime = rows[i].create_time;//创建时间
                        var festival = new Festival(id, name, startDate, endDate, notes, createUser, createTime);
                        this.festivalList.push(festival);
                    }
                    // callback(result.result);
                    callback(this.festivalList)
                }
            },
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }


    // //上一页
    // prePage() {
    //     var pageIndex = parseInt(this.domObj.find(".div-pagetool button.current span.currentpage").text());
    //     var prePage = pageIndex - 1;
    //     if (prePage < 1) {
    //         return;
    //     } else {
    //         this.pageIndex = prePage;
    //         this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
    //     }
    // }

    // //下一页
    // nextPage() {
    //     var pageIndex = parseInt(this.domObj.find(".div-pagetool button.current span.currentpage").text());
    //     var totalPage = parseInt(this.domObj.find(".div-pagetool button.current span.totalpage").text());
    //     var nextPage = pageIndex + 1;
    //     if (nextPage > totalPage) {
    //         return;
    //     } else {
    //         this.pageIndex = nextPage;
    //         this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
    //     }
    // }

    // //跳转到另外一页
    // goPage() {
    //     var pageIndex = parseInt(this.domObj.find(".div-pagetool div.go input.currpage").val());
    //     var totalPage = parseInt(this.domObj.find(".div-pagetool button.current span.totalpage").text());
    //     var goPage = pageIndex;
    //     if (goPage > totalPage || goPage < 1) {
    //         return;
    //     } else {
    //         this.pageIndex = goPage;
    //         this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
    //     }
    // }

    // //增、删、改等按钮点击事件
    // toolbarClick(event) {
    //     var handleType = $(event.currentTarget).attr("handletype");
    //     if (handleType === "add") {
    //         this.popup.setSize(600, 350);
    //         var Obj = this.popup.Show("新增节日", this.template.split('$$')[1]);
    //         this.initDateWidget("#XJFestivalManager-add input.date");
    //         Obj.submitObj.off("click").on("click", function () {
    //             var festivalName = Obj.conObj.find('.festivalname').val();
    //             var startDate = Obj.conObj.find('.startdate').val();
    //             var endDate = Obj.conObj.find('.enddate').val();
    //             var notes = Obj.conObj.find('.notes').val();
    //             this.addVacationType(festivalName, startDate, endDate, notes);
    //         }.bind(this));
    //     } else if (handleType === "modify") {
    //         var selctedItem = this.domObj.find("#maincontent tbody input:checked");
    //         if (selctedItem.length === 0) {
    //             this.AppX.runtimeConfig.toast.Show("请选择要修改的假期类型！");
    //         } else if (selctedItem.length > 1) {
    //             this.AppX.runtimeConfig.toast.Show("只能修改单条记录！");
    //         } else {
    //             var selectRow = selctedItem.parents("tr");
    //             var buildeSiteID = selctedItem.attr("buildsiteid");
    //             var name = selectRow.children("td.name").text();
    //             var description = selectRow.children("td.description").text();
    //             var time = selectRow.children("td.timespan").text();
    //             var startDate = time.split("->")[0];
    //             var endDate = time.split("->")[1];
    //             this.popup.setSize(600, 350);
    //             var Obj = this.popup.Show("修改节日", this.template.split('$$')[2]);
    //             this.initDateWidget("#XJFestivalManager-modify input.date");
    //             Obj.conObj.find('.festivalname').val(name);
    //             Obj.conObj.find('.notes').val(description);
    //             Obj.conObj.find('.startdate').val(startDate);
    //             Obj.conObj.find('.enddate').val(endDate);
    //             //提交按钮事件
    //             Obj.submitObj.off("click").on("click", function (event) {
    //                 var festivalName = Obj.conObj.find('.festivalname').val();
    //                 var startDate = Obj.conObj.find('.startdate').val();
    //                 var endDate = Obj.conObj.find('.enddate').val();
    //                 var notes = Obj.conObj.find('.notes').val();
    //                 this.modifyVacationType(buildeSiteID, festivalName, startDate, endDate, notes);
    //             }.bind(this));
    //         }

    //     } else if (handleType === "delete") {
    //         var selctedItems = this.domObj.find("#maincontent tbody input:checked");
    //         if (selctedItems.length === 0) {
    //             this.AppX.runtimeConfig.toast.Show("请选择要删除的假期类型！");
    //         } else {

    //             this.popup.setSize(300, 150);
    //             var Obj = this.popup.ShowMessage("提示", "确认需删除选择数据？");
    //             Obj.submitObj.off("click").on("click", function () {
    //                 this.popup.Close();
    //                 var buildeSiteId = [];
    //                 selctedItems.attr("buildsiteid", function (index, val) {
    //                     buildeSiteId.push(val);
    //                     return val;
    //                 });
    //                 this.deleteVacationType(buildeSiteId, selctedItems);
    //             }.bind(this));

    //         }
    //     } else if (handleType === "refresh") {
    //         this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
    //     }
    // }


    // //checkbox全选回调函数
    // selecteAll(event) {
    //     var checked = $(event.currentTarget).prop("checked");
    //     if (checked === true) {
    //         this.domObj.find(" #maincontent tbody input").prop("checked", true);
    //         this.domObj.find("#maincontent tbody tr").addClass("success");
    //         this.domObj.find("#maincontent tbody tr").attr("choosed", "yes");
    //     } else {
    //         this.domObj.find(" #maincontent tbody input").prop("checked", "");
    //         this.domObj.find(" #maincontent tbody tr").removeClass("success");
    //         this.domObj.find("#maincontent tbody tr").attr("choosed", "no");
    //     }
    // }

    // //初始化假期类型列表
    // initVacationTypeList(result) {
    //     var rows = result.rows;
    //     var template = this.domObj.find(".buildsitecontent tbody #template").text().trim();
    //     var html = "";
    //     var data = [];
    //     for (var i = 0, length = rows.length; i < length; i++) {
    //         var id = rows[i].id;
    //         var creatTime = rows[i].create_time;
    //         var festivalName = rows[i].name;
    //         var timespan = rows[i].start_date.split(" ")[0] + "->" + rows[i].end_date.split(" ")[0]
    //         var description = rows[i].notes;
    //         data = [id, i + 1, festivalName, timespan, description, creatTime];
    //         var index = 0;
    //         var templateRepalce = template.replace(/%[a-zA-Z]+%/g, function () {
    //             return (index < data.length) ? (data[index++]) : '';
    //         });
    //         html += templateRepalce;
    //     }
    //     this.domObj.find(".buildsitecontent tbody").append(html);

    //     var total = result.total;//总记录数
    //     var pageSize = result.pagesize || 20;//每页显示几条
    //     var pageIndex = result.pageindex || 1;//第几页
    //     var totalPage = Math.ceil(parseInt(total) / parseInt(pageSize));//总页数
    //     this.domObj.find(".buildsitecontent .pagecontrol .total").text(total);
    //     this.domObj.find(".buildsitecontent .pagecontrol .pagesize").text(pageSize);
    //     this.domObj.find(".buildsitecontent  span.totalpage").text(totalPage);
    //     this.domObj.find(".buildsitecontent  span.currentpage").text(pageIndex);
    //     //每一条记录点击事件绑定
    //     this.domObj.find(" #maincontent tbody tr").bind("click", this.selecteItem.bind(this));
    // }

    // //列表项全选
    // selecteItem(event) {
    //     var state = $(event.currentTarget).attr("choosed");
    //     if (state === "no") {
    //         $(event.currentTarget).addClass("success");
    //         $(event.currentTarget).attr("choosed", "yes");
    //         $(event.currentTarget).find("td input").prop("checked", true);
    //     } else {
    //         $(event.currentTarget).removeClass("success");
    //         $(event.currentTarget).attr("choosed", "no");
    //         $(event.currentTarget).find("td input").prop("checked", false);
    //     }
    // }




    //初始化节假日安排日期控件
    initFestivalArrayCalendar(festivalList: Array<Festival>) {
        var festivalDatas = [];
        for (var i = 0, length = festivalList.length; i < length; i++) {
            var oneFestivalData = festivalList[i].getCalendarDataSource();
            festivalDatas.push(oneFestivalData);
        }
        var currentYear = new Date().getFullYear();
        var redDateTime = new Date(currentYear, 2, 13).getTime();
        $('#calendar').calendar({
            language: "ch",
            enableContextMenu: true,
            enableRangeSelection: true,
            contextMenuItems: [
                {
                    text: '修改',
                    click: this.editEvent.bind(this)
                },
                {
                    text: '删除',
                    click: this.deleteEvent.bind(this)
                }
            ],
            dataSource: festivalDatas,
            disabledDays: [

            ],
            style: "background",
            // customDayRenderer: function (element, date) {
            //     if (date.getTime() == redDateTime) {
            //         $(element).css("background-color", "#ff0000");
            //         $(element).css("color", "white");

            //     }
            // },
            // customDataSourceRenderer: function (element, currentDate, events) {
            //     console.log(element);
            //     console.log(currentDate);
            //     console.log(currentDate);
            // },
            mouseOnDay: function (e) {
                if (e.events.length > 0) {
                    var content = '';

                    for (var i in e.events) {
                        content += '<div class="event-tooltip-content">'
                            + '<div class="event-name" style="color:' + e.events[i].color + '">' + e.events[i].name + '</div>'
                            + '<div class="event-location">' + e.events[i].location + '</div>'
                            + '</div>';
                    }

                    $(e.element).popover({
                        trigger: 'manual',
                        container: 'body',
                        html: true,
                        content: content
                    });

                    $(e.element).popover('show');
                }
            },
            mouseOutDay: function (e) {
                if (e.events.length > 0) {
                    $(e.element).popover('hide');
                }
            },
            dayContextMenu: function (element, date) {

            },
            clickDay: function (e) {
                this.popup.setSize(600, 350);
                var Obj = this.popup.Show("新增节日", this.template.split('$$')[1]);
                this.initDateWidget("#XJFestivalManager-add input.date");
                Obj.submitObj.off("click").on("click", function () {
                    var festivalName = Obj.conObj.find('.festivalname').val();
                    var startDate = Obj.conObj.find('.startdate').val();
                    var endDate = Obj.conObj.find('.enddate').val();
                    var notes = Obj.conObj.find('.notes').val();
                    this.addVacationType(festivalName, startDate, endDate, notes);
                }.bind(this));
            }.bind(this),
            selectRange: function (event) {
                var startDateObj = event.startDate;
                var endDateObj = event.endDate
                var startDate = startDateObj.getFullYear() + "/" + (startDateObj.getMonth() + 1) + "/" + startDateObj.getDate();
                var endDate = endDateObj.getFullYear() + "/" + (endDateObj.getMonth() + 1) + "/" + endDateObj.getDate();
                this.popup.setSize(600, 350);
                var Obj = this.popup.Show("新增节日", this.template.split('$$')[1]);
                this.initDateWidget("#XJFestivalManager-add_1 input.date");
                $("#XJFestivalManager-add_1 input.startdate").val(startDate);
                $("#XJFestivalManager-add_1 input.enddate").val(endDate);
                Obj.submitObj.off("click").on("click", function () {
                    var festivalName = Obj.conObj.find('.festivalname').val();
                    var startDate = Obj.conObj.find('.startdate').val();
                    var endDate = Obj.conObj.find('.enddate').val();
                    var notes = Obj.conObj.find('.notes').val();
                    this.addVacationType(festivalName, startDate, endDate, notes);
                }.bind(this));
            }.bind(this)
        })
    }

    deleteEvent(event) {
        var id = event.id;
        this.popup.setSize(300, 150);
        var Obj = this.popup.ShowMessage("提示", "确认需删除选择数据？");
        Obj.submitObj.off("click").on("click", function () {
            this.popup.Close();

            this.deleteVacationType([id]);
        }.bind(this));
        var dataSource = $('#calendar').data('calendar').getDataSource();
        for (var i in dataSource) {
            if (dataSource[i].id == event.id) {
                dataSource.splice(i, 1);
                break;
            }
        }
        $('#calendar').data('calendar').setDataSource(dataSource);
    }

    editEvent(event) {
        var id = event.id;//节日台账id
        var festivalName = event.name;
        var notes = event.location;
        var startDate = event.startDate.getFullYear() + "/" + (event.startDate.getMonth() + 1) + "/" + event.startDate.getDate();
        var endDate = event.endDate.getFullYear() + "/" + (event.endDate.getMonth() + 1) + "/" + event.endDate.getDate()
        this.popup.setSize(600, 350);
        var Obj = this.popup.Show("修改节日", this.template.split('$$')[2]);
        this.initDateWidget("#XJFestivalManager-modify_2 input.date");
        Obj.conObj.find('.festivalname').val(festivalName);
        Obj.conObj.find('.notes').val(notes);
        Obj.conObj.find('.startdate').val(startDate);
        Obj.conObj.find('.enddate').val(endDate);
        //提交按钮事件
        Obj.submitObj.off("click").on("click", function (event) {
            var festivalName = Obj.conObj.find('.festivalname').val();
            var startDate = Obj.conObj.find('.startdate').val();
            var endDate = Obj.conObj.find('.enddate').val();
            var notes = Obj.conObj.find('.notes').val();
            this.modifyVacationType(id, festivalName, startDate, endDate, notes);
        }.bind(this));
    }

    //
    initDateWidget(selector) {
        $(selector).jeDate({
            format: 'YYYY/MM/DD', //日期格式  
            isinitVal: true,
            initAddVal: $.nowDate(0)
        })
    }



    //新增假期类型
    addVacationType(festivalName, startDate, endDate, notes) {
        var config = this.config.addVacationType;
        var toast = this.AppX.runtimeConfig.toast;
        //验证必填项
        if (festivalName == "" || startDate == "" || endDate == "") {
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
                "name": festivalName,
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
                    this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initFestivalArrayCalendar.bind(this));
                    // this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
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
                    toast.Show(config.MSG_error);
                } else {
                    toast.Show(config.MSG_success);
                    this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initFestivalArrayCalendar.bind(this));
                    // this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initVacationTypeList.bind(this));
                }
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //修改假期类型
    modifyVacationType(buildeSiteId, festivalName, startDate, endDate, notes) {
        var config = this.config.modifyVacationType;
        var toast = this.AppX.runtimeConfig.toast;
        //验证必填项
        if (festivalName == "" || startDate == "" || endDate == "") {
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
                "name": festivalName,
                "start_date": startDate,
                "end_date": endDate,
                "notes": notes
            },
            success: function (result) {
                if (result.code !== 1) {
                    this.popup.ShowTip(config.MSG_error);
                } else {
                    this.popup.Close();
                    toast.Show(config.MSG_success);
                    this.requestVacationTypeInfo(this.pageIndex, this.pageSize, "", this.initFestivalArrayCalendar.bind(this));
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

//节日类
class Festival {
    id: string;//计划id
    name: string;//节日名称
    startDate: string;//开始时间
    endDate: string;//结束时间
    notes: string;//说明
    createUser: string;//创建用户
    createTime: string;//创建时间
    constructor(id, name, startDate, endDate, notes, createUser, createTime) {
        this.id = id;
        this.name = name;
        this.startDate = startDate;
        this.endDate = endDate;
        this.notes = notes;
        this.createUser = createUser;
        this.createTime = createTime;
    }

    getCalendarDataSource() {
        var dataObj = {
            id: "",
            name: "",
            location: "",
            startDate: {},
            endDate: {}
        }
        dataObj.id = this.id;
        dataObj.name = this.name;
        dataObj.location = this.notes;
        var startDate = this.startDate.split(" ")[0];
        var endDate = this.endDate.split(" ")[0]
        dataObj.startDate = new Date(parseInt(startDate.split("-")[0]), parseInt(startDate.split("-")[1]) - 1, parseInt(startDate.split("-")[2]));
        dataObj.endDate = new Date(parseInt(endDate.split("-")[0]), parseInt(endDate.split("-")[1]) - 1, parseInt(endDate.split("-")[2]));
        return dataObj;
    }

}