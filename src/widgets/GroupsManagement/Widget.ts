import BaseWidget = require('core/BaseWidget.class');
export = GroupsManagement;

class GroupsManagement extends BaseWidget {
    baseClass = "widget-groupsmanagement";

    toast = null;
    popup = null;
    popupdomObj = null;
    isfirst = false;
    totalpage = 1;
    currentpage = 1;
    currentpagesieze = 13;


    userid = "";
    username = "";
    loginid = "";
    companyid = "";
    depid = "";
    pdaid = "";
    pdaname = "";
    roleid = "";
    online = "";
    state = "";

    iscandelete = false;


    logs = "";
    className = "dark";
    newCount = 1;

    groupid = "";

    setting = null;
    zNodes = [];


    startup() {
        this.configure();
        this.initHtml();
        this.initEvent();

    }

    configure() {
        this.toast = this.AppX.runtimeConfig.toast;
        this.popup = this.AppX.runtimeConfig.popup;
        //获取用户信息
    }
    initHtml() {
        var html = _.template(this.template.split('$$')[0] + "</div>")({ range: AppX.appConfig.range.split(";")[0] });

        this.setHtml(html);
        this.ready();
        this.getGroup();


    }



    getGroup() {

        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                'range': AppX.appConfig.range,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getGroupList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 10000,
                // f: "pjson"
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
            that.toast.Show("查询用户信息出错！");
            console.log(results.message);
            return;
        }

        that.setting = {
            view: {
                // addHoverDom: this.addHoverDom,
                // removeHoverDom: this.removeHoverDom,
                selectedMulti: false
            },
            edit: {
                // enable: true,
                // editNameSelectAll: true,
                // showRemoveBtn: this.showRemoveBtn,
                // showRenameBtn: this.showRenameBtn
            },
            data: {
                simpleData: {
                    enable: true
                }
            },
            callback: {
                beforeDrag: this.beforeDrag,
                beforeEditName: this.beforeEditName,
                beforeRemove: this.beforeRemove,
                beforeRename: this.beforeRename,
                onRemove: this.onRemove,
                onDblClick: this.OnDblClick.bind(this),
                onClick: this.OnClick.bind(this),
                // onRename:  this.onRename
            }
        };

        that.zNodes = [
            // { id: 1, pId: 0, name: "父节点 1", open: true },
            // { id: 11, pId: 1, name: "叶子节点 1-1" },
            // { id: 12, pId: 1, name: "叶子节点 1-2" },
            // { id: 13, pId: 1, name: "叶子节点 1-3" },
            // { id: 2, pId: 0, name: "父节点 2", open: true },
            // { id: 21, pId: 2, name: "叶子节点 2-1" },
            // { id: 22, pId: 2, name: "叶子节点 2-2" },
            // { id: 23, pId: 2, name: "叶子节点 2-3" },
            // { id: 3, pId: 0, name: "父节点 3", open: true },
            // { id: 31, pId: 3, name: "叶子节点 3-1" },
            // { id: 32, pId: 3, name: "叶子节点 3-2" },
            // { id: 33, pId: 3, name: "叶子节点 3-3" }
        ];






        if (this.config.crdepartmentid == AppX.appConfig.departmentid) {

            that.zNodes = [];
            $.each(results.result.rows, function (i, item) {
                that.zNodes.push({ id: item.id, pId: item.parentid, name: item.name, address: item.address, contact: item.contact, phone: item.phone, fax: item.fax, open: true });
            });

            //当为总公司时查询分公司信息公司
            this.getCompany();

        } else {

            //自动添加父节点（公司名）
            that.zNodes = [
                { id: AppX.appConfig.departmentid, pId: 0, name: AppX.appConfig.departmentname, address: "", contact: "", phone: "", fax: "", open: true }
            ];
            $.each(results.result.rows, function (i, item) {
                that.zNodes.push({ id: item.id, pId: item.parentid, name: item.name, address: item.address, contact: item.contact, phone: item.phone, fax: item.fax, open: true });
            });

            $.fn.zTree.init($("#treeDemo"), that.setting, that.zNodes);
        }






        // $.fn.zTree.init($("#treeDemo"), setting, that.zNodes);







    }


    beforeDrag(treeId, treeNodes) {
        return false;
    }
    beforeEditName(treeId, treeNode) {
        this.className = (this.className === "dark" ? "" : "dark");
        //  this.showLog("[ " +  this.getTime() + " beforeEditName ]&nbsp;&nbsp;&nbsp;&nbsp; " + treeNode.name);
        var zTree = $.fn.zTree.getZTreeObj("treeDemo");
        zTree.selectNode(treeNode);
        setTimeout(function () {
            if (confirm("进入节点 -- " + treeNode.name + " 的编辑状态吗？")) {
                setTimeout(function () {
                    zTree.editName(treeNode);
                }, 0);
            }
        }, 0);
        return false;
    }
    beforeRemove(treeId, treeNode) {
        this.className = (this.className === "dark" ? "" : "dark");
        // this.showLog("[ " +  this.getTime() + " beforeRemove ]&nbsp;&nbsp;&nbsp;&nbsp; " + treeNode.name);
        var zTree = $.fn.zTree.getZTreeObj("treeDemo");
        zTree.selectNode(treeNode);
        return confirm("确认删除 节点 -- " + treeNode.name + " 吗？");
    }
    onRemove(e, treeId, treeNode) {
        // this.showLog("[ " +  this.getTime() + " onRemove ]&nbsp;&nbsp;&nbsp;&nbsp; " + treeNode.name);
    }
    OnDblClick(e, treeId, treeNode) {

        // alert(treeNode ? treeNode.tId + ", " + treeNode.name : "isRoot");


        var zTree = $.fn.zTree.getZTreeObj("treeDemo");
        var selectedNodes = zTree.getSelectedNodes();


        var zTree = $.fn.zTree.getZTreeObj("treeDemo");
        var selectedNodes = zTree.getSelectedNodes();
        if (selectedNodes.length == 1) {
            if (selectedNodes[0].level == 0) {
                // this.toast.Show("暂时不支持修改第一级节点！");
                return;
            }
            // if (selectedNodes[0].flag == 0 || (selectedNodes[0].getParentNode().flag == 0 && selectedNodes[0].getParentNode().getParentNode() != null)) {
            //     this.toast.Show("暂时不支持查看其他公司");
            //     return;
            // }
            selectedNodes[0].id;
            selectedNodes[0].name;
            if (treeNode != null) {
                this.popup.setSize(600, 335);

                var Obj = this.popup.Show("查看", this.template.split('$$')[2], true);
                //赋值

                //   this.userid = $(e.currentTarget).data("userid");
                Obj.conObj.find('.name').val(treeNode.name);
                Obj.conObj.find('.contact').val(treeNode.contact);
                Obj.conObj.find('.address').val(treeNode.address);
                Obj.conObj.find('.phone').val(treeNode.phone);
                // Obj.conObj.find('.fax').val(selectedNodes[0].fax);
                // Obj.conObj.find('.notes').val(selectedNodes[0].notes);
                // Obj.conObj.find('.type').val(selectedNodes[0].type);






                Obj.submitObj.off("click").on("click", function () {

                }.bind(this));


            } else {

            }



        } else {
            // this.toast.Show("请选择一个节点进行添加！");
        }

    }

    OnClick(e, treeId, treeNode) {

        // alert(treeNode ? treeNode.tId + ", " + treeNode.name : "isRoot");


        var zTree = $.fn.zTree.getZTreeObj("treeDemo");
        var selectedNodes = zTree.getSelectedNodes();


        var zTree = $.fn.zTree.getZTreeObj("treeDemo");
        var selectedNodes = zTree.getSelectedNodes();
        if (selectedNodes.length == 1) {
            if (selectedNodes[0].level == 0) {
                // this.toast.Show("暂时不支持修改第一级节点！");
                return;
            }
            // if (selectedNodes[0].flag == 0 || (selectedNodes[0].getParentNode().flag == 0 && selectedNodes[0].getParentNode().getParentNode() != null)) {
            //     this.toast.Show("暂时不支持查看其他公司");
            //     return;
            // }
            this.depid = selectedNodes[0].id;
            selectedNodes[0].name;

            //赋值

            //   this.userid = $(e.currentTarget).data("userid");
            // Obj.conObj.find('.name').val(treeNode.name);
            // Obj.conObj.find('.contact').val(treeNode.contact);
            // Obj.conObj.find('.address').val(treeNode.address);
            // Obj.conObj.find('.phone').val(treeNode.phone);
            // Obj.conObj.find('.fax').val(selectedNodes[0].fax);
            // Obj.conObj.find('.notes').val(selectedNodes[0].notes);
            // Obj.conObj.find('.type').val(selectedNodes[0].type);


            //查询该部门下所有用户
            //巡检部门查询本地
            //web端用户查询权限库

            this.getWebUser2();








        } else {
            this.toast.Show("请选择一个节点进行添加！");
        }

    }


    beforeRename(treeId, treeNode, newName, isCancel) {
        this.className = (this.className === "dark" ? "" : "dark");
        // this.showLog((isCancel ? "<span style='color:red'>" : "") + "[ " +  this.getTime() + " beforeRename ]&nbsp;&nbsp;&nbsp;&nbsp; " + treeNode.name + (isCancel ? "</span>" : ""));
        if (newName.length == 0) {
            setTimeout(function () {
                var zTree = $.fn.zTree.getZTreeObj("treeDemo");
                zTree.cancelEditName();
                alert("节点名称不能为空.");
            }, 0);
            return false;
        }
        return true;
    }

    showRemoveBtn(treeId, treeNode) {
        return !treeNode.isFirstNode;
    }
    showRenameBtn(treeId, treeNode) {
        return !treeNode.isLastNode;
    }


    getTime() {
        var now = new Date(),
            h = now.getHours(),
            m = now.getMinutes(),
            s = now.getSeconds(),
            ms = now.getMilliseconds();
        return (h + ":" + m + ":" + s + " " + ms);
    }

    addHoverDom(treeId, treeNode) {
        var sObj = $("#" + treeNode.tId + "_span");
        if (treeNode.editNameFlag || $("#addBtn_" + treeNode.tId).length > 0) return;
        var addStr = "<span class='button add' id='addBtn_" + treeNode.tId
            + "' title='add node' onfocus='this.blur();'></span>";
        sObj.after(addStr);
        var btn = $("#addBtn_" + treeNode.tId);
        if (btn) btn.bind("click", function () {
            var zTree = $.fn.zTree.getZTreeObj("treeDemo");
            zTree.addNodes(treeNode, { id: (100 + this.newCount), pId: treeNode.id, name: "new node" + (this.newCount++) });
            return false;
        });
    };
    removeHoverDom(treeId, treeNode) {
        $("#addBtn_" + treeNode.tId).unbind().remove();
    };
    selectAll() {
        var zTree = $.fn.zTree.getZTreeObj("treeDemo");
        zTree.setting.edit.editNameSelectAll = $("#selectAll").attr("checked");
    }


    initEvent() {
        var that = this;
        this.domObj.find('.btn_add').on("click", function () {


            var zTree = $.fn.zTree.getZTreeObj("treeDemo");
            var selectedNodes = zTree.getSelectedNodes();
            if (selectedNodes.length == 1) {
                // if (selectedNodes[0].level == 1) {
                //     this.toast.Show("暂时不支持添加第三级节点！");
                //     return;
                // }
                console.log(selectedNodes[0].id);
                console.log(selectedNodes[0].name);
                console.log(selectedNodes[0].level);
                console.log(typeof (selectedNodes[0].id));

                var companyid;

                if (selectedNodes[0].level == 1) {
                    //获取0级
                    companyid = selectedNodes[0].id;


                }

                if (selectedNodes[0].level == 2) {
                    //获取0级
                    if (selectedNodes[0].getParentNode().pId != "88") {
                        this.toast.Show("暂时不支持添加子节点！");
                        return;
                    } else {

                        if (typeof (selectedNodes[0].getParentNode().id) == "string") {
                            this.toast.Show("暂时不支持添加子节点！");
                            return;
                        }

                    }
                    companyid = selectedNodes[0].getParentNode().id;

                }
                if (selectedNodes[0].level == 3) {
                    this.toast.Show("暂时不支持添加子节点！");
                    return;
                    // if (typeof (selectedNodes[0].id) == "number") {
                    //     this.toast.Show("暂时不支持添加子节点！");
                    //     return;
                    // }

                }
                // if (typeof (selectedNodes[0].id) == "string") {
                //     this.toast.Show("暂时不支持添加子节点！");
                //     return;
                // }
                selectedNodes[0].id;
                selectedNodes[0].name;

                //弹出popup
                this.popup.setSize(600, 335);
                var Obj = this.popup.Show("新增", this.template.split('$$')[1]);

                //验证
                (<any>$('#groupsmanagement_addpopup')).bootstrapValidator();

                Obj.submitObj.off("click").on("click", function () {
                    var name = Obj.conObj.find('.name');
                    var contact = Obj.conObj.find('.contact');
                    var address = Obj.conObj.find('.address');
                    var phone = Obj.conObj.find('.phone');
                    var depid = Obj.conObj.find('.depid');
                    if (name.val() == '') {
                        name.addClass('has-error');
                        name.attr("placeholder", "不能为空！");
                        // this.toast.Show("联系人不能为空！");
                        return;
                    } else {
                        if (name.val().length > 20) {
                            this.toast.Show("名称字段长度不得超过20 ");
                            return;
                        }
                    }
                    if (contact.val() != '') {
                        if (contact.val().length > 20) {
                            this.toast.Show("联系人字段长度不得超过20 ");
                            return;
                        }
                    }
                    if (phone.val() == '') {

                    } else {
                        var reg = /^1(3|4|5|7|8)\d{9}$/;
                        if (!reg.test(phone.val())) {
                            this.toast.Show("手机号码验证不通过 ");
                            return;
                        }
                    }
                    $.ajax({
                        headers: {
                            'Token': AppX.appConfig.xjxj,
                            'departmentid': AppX.appConfig.departmentid,
                        },
                        type: "POST",
                        url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.addGroup,
                        data: {
                            // "parentid": AppX.appConfig.departmentid,
                            // "name": AppX.appConfig.departmentname,
                            "parentid": selectedNodes[0].id,
                            "name": name.val(),
                            "contact": contact.val(),
                            "address": address.val(),
                            "phone": phone.val(),
                            "companyid": companyid,
                            // f: "pjson"
                        },
                        success: this.addGroupCallback.bind(this),
                        error: function (data) {
                            this.toast.Show("服务端ajax出错，获取数据失败!");
                        }.bind(this),
                        dataType: "json",
                    });

                }.bind(this));


            } else {
                this.toast.Show("请选择一个节点进行添加！");
            }









        }.bind(this));

        this.domObj.find('.btn_edit').on("click", function () {



            // var zTree = $.fn.zTree.getZTreeObj("treeDemo");
            // var selectedNodes = zTree.getSelectedNodes();
            // selectedNodes[0].id
            var zTree = $.fn.zTree.getZTreeObj("treeDemo");
            var selectedNodes = zTree.getSelectedNodes();

            if (selectedNodes.length == 1) {
                // if (selectedNodes[0].level == 0) {
                //     this.toast.Show("暂时不支持修改第一级节点！");
                //     return;
                // }
                // if (selectedNodes[0].flag == 0 || (selectedNodes[0].getParentNode().flag == 0 && selectedNodes[0].getParentNode().getParentNode() != null)) {
                //     this.toast.Show("暂时不支持修改其他公司");
                //     return;
                // }





                if (typeof (selectedNodes[0].id) == "number") {
                    this.toast.Show("暂时不支持修改公司！");
                    return;
                }
                selectedNodes[0].id;
                selectedNodes[0].name;
                this.popup.setSize(600, 335);

                var Obj = this.popup.Show("修改", this.template.split('$$')[2]);
                //赋值

                //   this.userid = $(e.currentTarget).data("userid");
                Obj.conObj.find('.name').val(selectedNodes[0].name);
                Obj.conObj.find('.contact').val(selectedNodes[0].contact);
                Obj.conObj.find('.address').val(selectedNodes[0].address);
                Obj.conObj.find('.phone').val(selectedNodes[0].phone);
                // Obj.conObj.find('.fax').val(selectedNodes[0].fax);
                // Obj.conObj.find('.notes').val(selectedNodes[0].notes);
                // Obj.conObj.find('.type').val(selectedNodes[0].type);



                //验证
                (<any>$('#groupsmanagement_updatepopup')).bootstrapValidator();

                Obj.submitObj.off("click").on("click", function () {
                    var name = Obj.conObj.find('.name');
                    var contact = Obj.conObj.find('.contact');
                    var address = Obj.conObj.find('.address');
                    var phone = Obj.conObj.find('.phone');

                    if (name.val() == '') {
                        name.addClass('has-error');
                        name.attr("placeholder", "不能为空！");
                        this.toast.Show("用户名称不能为空！");
                        return;
                    } else {
                        if (name.val().length > 20) {
                            this.toast.Show("名称字段长度不得超过20 ");
                            return;
                        }
                    }
                    if (contact.val() != '') {
                        if (contact.val().length > 20) {
                            this.toast.Show("联系人字段长度不得超过20 ");
                            return;
                        }
                    }
                    if (phone.val() == '') {

                    } else {
                        var reg = /^1(3|4|5|7|8)\d{9}$/;
                        if (!reg.test(phone.val())) {
                            this.toast.Show("手机号码验证不通过 ");
                            return;
                        }
                    }


                    $.ajax({
                        headers: {
                            'Token': AppX.appConfig.xjxj,
                            'departmentid': AppX.appConfig.departmentid,
                        },
                        type: "POST",
                        url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updateGroup,
                        data: {
                            "id": selectedNodes[0].id,
                            "parentid": selectedNodes[0].pId,
                            "name": name.val(),
                            "contact": contact.val(),
                            "address": address.val(),
                            "phone": phone.val(),
                            // "fax": fax.val(),
                            // "notes": type.val(),
                            // "type": type.val(),
                            // f: "pjson"
                        },
                        success: this.updateGroupCallback.bind(this),
                        error: function (data) {
                            this.toast.Show("服务端ajax出错，获取数据失败!");
                        }.bind(this),
                        dataType: "json",
                    });
                }.bind(this));



            } else {
                this.toast.Show("请选择一个节点进行添加！");
            }










        }.bind(this));



        this.domObj.find('.btn_delete').on("click", function () {

            var zTree = $.fn.zTree.getZTreeObj("treeDemo");
            var selectedNodes = zTree.getSelectedNodes();


            var zTree = $.fn.zTree.getZTreeObj("treeDemo");
            var selectedNodes = zTree.getSelectedNodes();
            if (selectedNodes.length == 1) {
                // if (selectedNodes[0].level == 0) {
                //     this.toast.Show("暂时不支持删除第一级节点！");
                //     return;
                // }
                // if (selectedNodes[0].flag == 0 || (selectedNodes[0].getParentNode().flag == 0 && selectedNodes[0].getParentNode().getParentNode() != null)) {
                //     this.toast.Show("暂时不支持删除其他公司");
                //     return;
                // }
                if (typeof (selectedNodes[0].id) == "number") {
                    this.toast.Show("暂时不支持删除公司！");
                    return;
                }

                if (this.iscandelete == false) {
                    this.toast.Show("请先解除当前分组/部门绑定用户");
                    return;
                }


                this.popup.setSize(600, 150);

                var Obj = this.popup.Show("删除", this.template.split('$$')[3]);
                //赋值


                Obj.submitObj.off("click").on("click", function () {

                    this.groupid = selectedNodes[0].id;
                    selectedNodes[0].name;
                    //查询当前部门下是否有人员，有则不能删除
                    this.getUser(selectedNodes[0].id);

                }.bind(this));






            } else {
                this.toast.Show("请选择一个节点进行删除！");
            }




        }.bind(this));


        // 选中行高亮
        this.domObj.off("click").on('click', 'tbody tr', (e) => {
            if ($(e.currentTarget).data("userid") == null) {
                return;
            } else {
                this.userid = $(e.currentTarget).data("userid");
                this.username = $(e.currentTarget).data("username");
                this.loginid = $(e.currentTarget).data("loginid");
                this.companyid = $(e.currentTarget).data("companyid");
                this.depid = $(e.currentTarget).data("depid");
                this.pdaid = $(e.currentTarget).data("pdaid");
                this.pdaname = $(e.currentTarget).data("pdaname");
                this.roleid = $(e.currentTarget).data("roleid");
                this.online = $(e.currentTarget).data("online");
                this.state = $(e.currentTarget).data("state");

            }
            this.domObj.find('tr.active').removeClass('active');
            $(e.currentTarget).addClass('active');



        });


        // 双击查看
        this.domObj.off("dblclick").on('dblclick', 'tbody tr', (e) => {



            var zTree = $.fn.zTree.getZTreeObj("treeDemo");
            var selectedNodes = zTree.getSelectedNodes();


            var zTree = $.fn.zTree.getZTreeObj("treeDemo");
            var selectedNodes = zTree.getSelectedNodes();
            if (selectedNodes.length == 1) {
                if (selectedNodes[0].level == 0) {
                    this.toast.Show("暂时不支持修改第一级节点！");
                    return;
                }
                if (selectedNodes[0].flag == 0 || (selectedNodes[0].getParentNode().flag == 0 && selectedNodes[0].getParentNode().getParentNode() != null)) {
                    this.toast.Show("暂时不支持查看其他公司");
                    return;
                }
                selectedNodes[0].id;
                selectedNodes[0].name;
                this.popup.setSize(600, 335);

                var Obj = this.popup.Show("修改", this.template.split('$$')[2]);
                //赋值

                //   this.userid = $(e.currentTarget).data("userid");
                Obj.conObj.find('.name').val(selectedNodes[0].name);
                Obj.conObj.find('.contact').val(selectedNodes[0].contact);
                Obj.conObj.find('.address').val(selectedNodes[0].address);
                Obj.conObj.find('.phone').val(selectedNodes[0].phone);
                // Obj.conObj.find('.fax').val(selectedNodes[0].fax);
                // Obj.conObj.find('.notes').val(selectedNodes[0].notes);
                // Obj.conObj.find('.type').val(selectedNodes[0].type);



                //验证
                (<any>$('#groupsmanagement_updatepopup')).bootstrapValidator();

                Obj.submitObj.off("click").on("click", function () {
                    var name = Obj.conObj.find('.name');
                    var contact = Obj.conObj.find('.contact');
                    var address = Obj.conObj.find('.address');
                    var phone = Obj.conObj.find('.phone');

                    if (name.val() == '') {
                        name.addClass('has-error');
                        name.attr("placeholder", "不能为空！");
                        this.toast.Show("用户名称不能为空！");
                        return;
                    }

                    $.ajax({
                        headers: {
                            'Token': AppX.appConfig.xjxj,
                            'departmentid': AppX.appConfig.departmentid,
                        },
                        type: "POST",
                        url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.updateGroup,
                        data: {
                            "id": selectedNodes[0].id,
                            "parentid": selectedNodes[0].pId,
                            "name": name.val(),
                            "contact": contact.val(),
                            "address": address.val(),
                            "phone": phone.val(),
                            // "fax": fax.val(),
                            // "notes": type.val(),
                            // "type": type.val(),
                            // f: "pjson"
                        },
                        success: this.updateGroupCallback.bind(this),
                        error: function (data) {
                            this.toast.Show("服务端ajax出错，获取数据失败!");
                        }.bind(this),
                        dataType: "json",
                    });
                }.bind(this));



            } else {
                this.toast.Show("请选择一个节点进行添加！");
            }










        });



        this.domObj.find('.btn_bind').on("click", function () {



            var zTree = $.fn.zTree.getZTreeObj("treeDemo");
            var selectedNodes = zTree.getSelectedNodes();
            if (selectedNodes.length == 1) {
                // if (selectedNodes[0].level == 0) {
                //     this.toast.Show("暂时不支持删除第一级节点！");
                //     return;
                // }
                // if (selectedNodes[0].flag == 0 || (selectedNodes[0].getParentNode().flag == 0 && selectedNodes[0].getParentNode().getParentNode() != null)) {
                //     this.toast.Show("暂时不支持操作其他公司");
                //     return;
                // }
                if (typeof (selectedNodes[0].id) == "number") {
                    this.toast.Show("暂时不支持操作公司！");
                    return;
                }
                // selectedNodes[0].id
                this.getWebUser();

                // this.popup.setSize(600, 500);

                // var Obj = this.popup.Show("绑定用户", this.template.split('$$')[4]);

                // Obj.submitObj.off("click").on("click", function () {

                //     this.groupid = selectedNodes[0].id;
                //     selectedNodes[0].name;
                //     this.getUser(selectedNodes[0].id);

                // }.bind(this));






            } else {
                this.toast.Show("请选择一个部门进行绑定！");
            }




        }.bind(this));


        this.domObj.find('.btn_unbind').on("click", function () {



            var zTree = $.fn.zTree.getZTreeObj("treeDemo");
            var selectedNodes = zTree.getSelectedNodes();
            if (selectedNodes.length == 1) {
                // if (selectedNodes[0].level == 0) {
                //     this.toast.Show("暂时不支持删除第一级节点！");
                //     return;
                // }
                // if (selectedNodes[0].flag == 0 || (selectedNodes[0].getParentNode().flag == 0 && selectedNodes[0].getParentNode().getParentNode() != null)) {
                //     this.toast.Show("暂时不支持操作其他公司");
                //     return;
                // }

                if (typeof (selectedNodes[0].id) == "number") {
                    this.toast.Show("暂时不支持操作公司！");
                    return;
                }


                if (this.domObj.find('.users_li  input:checkbox:checked').lenght == 0) {
                    this.toast.Show("请选择一个用户进行解绑！");
                } else {

                }
                console.log(this.domObj.find("users_li").lenght);
                this.domObj.find("users_li").lenght;


                // this.unbindgroup();


                var arr = [];
                var strusersid = "";
                $.each(this.domObj.find('.users_li input:checkbox:checked '), function (i, item) {

                    arr.push(item.id);
                    strusersid += item.id + ",";
                });



                //jie绑定用户

                this.unbindgroup(strusersid.substr(0, strusersid.length - 1));






            } else {
                this.toast.Show("请选择一个部门进行解绑！");
            }




        }.bind(this));


        //定义节点点击事件，获取当前部门用户信息；









    }


    addGroupCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);

        //重新查询
        this.getGroup();

        //清空：选中、新增时产生的选中，避免直接点删除
        this.userid = "";
        this.username = "";
        this.loginid = "";
        this.companyid = "";
        this.depid = "";
        this.pdaid = "";
        this.pdaname = "";
        this.roleid = "";
        this.online = "";
        this.state = "";

    }

    updateGroupCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);

        //重新查询
        this.getGroup();

        //清空修改时产生的选中，避免直接点删除
        this.userid = "";
        this.username = "";
        this.loginid = "";
        this.companyid = "";
        this.depid = "";
        this.pdaid = "";
        this.pdaname = "";
        this.roleid = "";
        this.online = "";
        this.state = "";


    }

    bindPadCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);

        //重新查询
        this.getGroup();


    }



    deleteGroupCallback(results) {

        var that = this;
        if (results.code != 1) {
            that.toast.Show(results.message);
            console.log(results.message);
            return;
        }
        this.popup.Close();
        that.toast.Show(results.message);


        //清空数据
        this.userid = "";
        this.username = "";
        this.loginid = "";
        this.companyid = "";
        this.depid = "";
        this.pdaid = "";
        this.roleid = "";
        this.online = "";
        this.state = "";

        this.groupid = "";

        //重新查询
        this.getGroup();


    }



    getUser(depid) {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getUserList,
            data: {
                "depid": depid,
                // f: "pjson"
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
            that.toast.Show("查询用户信息出错！");
            console.log(results.message);
            return;
        }
        if (results.result.total % this.config.pagesize == 0) {
            this.totalpage = Math.floor(parseInt(results.result.total) / parseInt(this.config.pagesize));

        } else {
            this.totalpage = Math.floor(parseInt(results.result.total) / parseInt(this.config.pagesize)) + 1;

        }
        if (results.result.rows.length != 0) {
            this.toast.Show("分组已被使用，不允许删除!");
        } else {
            //删除分组

            $.ajax({
                headers: {
                    // 'Authorization-Token': AppX.appConfig.xjxj
                    'Token': AppX.appConfig.xjxj,
                    'departmentid': AppX.appConfig.departmentid,
                },
                type: "POST",
                url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.deleteGroup + this.groupid,
                data: {
                    "id": this.groupid,
                    // f: "pjson"
                },
                success: this.deleteGroupCallback.bind(this),
                error: function (data) {
                    this.toast.Show("服务端ajax出错，获取数据失败!");
                }.bind(this),
                dataType: "json",
            });


        }


    }


    getCompany() {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                // 'range': AppX.appConfig.range,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getCompanyList,
            data: {
                // "depid": depid,
                // f: "pjson"
            },
            success: this.getCompanyListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getCompanyListCallback(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询公司信息出错！");
            console.log(results.message);
            return;
        }
        //组织数据

        $.each(results.result, function (i, item) {
            that.zNodes.push({ id: item.companyid, pId: that.config.crdepartmentid, name: item.company_name, flag: item.flag, address: item.address, contact: item.contact, phone: item.phone, fax: item.fax, open: true });
        });

        $.fn.zTree.init($("#treeDemo"), that.setting, that.zNodes);



    }

    //查询权限系统可绑定用户
    getWebUser() {
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken,
                // 'Token': AppX.appConfig.xjxj,
                // 'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.getWebUserList_withoutgroup,
            data: {
                "depid": AppX.appConfig.departmentid,
                // f: "pjson"
            },
            success: this.getWebUserListCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getWebUserListCallback(results) {
        var that = this;
        if (results.code != 10000) {
            that.toast.Show("查询web用户信息出错！");
            console.log(results.message);
            return;
        }

        if (results.result.rows.length == 0) {
            this.toast.Show("当前公司无用户!");
            return;
        } else {


        }
        var lidom = "";
        results.result.rows.forEach(function (value) {
            lidom += "<li calss=list-group-item><div class=\"checkbox check2\"><label><input type=checkbox id=" + value.userid + " name=" + value.username + " value=" + value.alias + " alt=" + value.type + ">" + value.username + " (" + value.realname + ")</label></div></li></option>";



            // .appendTo(this.domObj.find(".users"));
            // if (value.visible)
            //     lidom.find('input').attr({ checked: "checked" });
        }.bind(this));


        this.popup.setSize(600, 500);
        var html = _.template(this.template.split('$$')[4])({ content: lidom });

        var Obj = this.popup.Show("绑定用户", html);

        //赋值


        Obj.submitObj.off("click").on("click", function () {

            // this.groupid = selectedNodes[0].id;
            // selectedNodes[0].name;
            // this.getUser(selectedNodes[0].id);
            console.log(121);
            Obj.conObj.find('.users');
            Obj.conObj.find('li');

            //  that.domObj.find(" #setting input:checkbox:checked");
            var arr = [];
            var strusersid = "";
            $.each(Obj.conObj.find('.users input:checkbox:checked '), function (i, item) {

                arr.push(item.id);
                strusersid += item.id + ",";
            });

            this.depid;

            //绑定用户

            this.bindgroup(strusersid.substr(0, strusersid.length - 1));




        }.bind(this));



    }

    //查询权限当前部门用户
    getWebUser2() {
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken,
                // 'Token': AppX.appConfig.xjxj,
                // 'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.getWebUserList_ongroup,
            data: {
                "groupid": this.depid,
                // f: "pjson"
            },
            success: this.getWebUserListCallback2.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getWebUserListCallback2(results) {
        var that = this;
        if (results.code != 10000) {
            that.toast.Show("查询web用户信息出错！");
            console.log(results.message);
            return;
        }

        if (results.result.rows.length == 0) {
            // this.toast.Show("当前部门无用户!");
            this.domObj.find(".users_li").empty();
            this.domObj.find(".users_li").append("当前部门无用户");
            this.iscandelete = true;
            return;
        } else {
            this.iscandelete = false;
        }

        this.domObj.find(".users_li").empty();
        var lidom = "";
        results.result.rows.forEach(function (value) {

            lidom += "<li calss=list-group-item><div class=\"checkbox check2\"><label><input type=checkbox id=" + value.userid + " name=" + value.username + " value=" + value.alias + " alt=" + value.type + ">" + value.username + " </label></div></li></option>";
            // .appendTo(this.domObj.find(".users"));
            // if (value.visible)
            //     lidom.find('input').attr({ checked: "checked" });
        }.bind(this));


        this.domObj.find(".users_li").append(lidom);



        //赋值




    }

    //查询分公司下面人员
    getUser2() {
        $.ajax({
            headers: {
                // 'Authorization-Token': AppX.appConfig.xjxj
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + this.config.getUserList,
            data: {
                "pageindex": this.config.pagenumber,
                "pagesize": 1000 || this.config.pagesize,
                "depid": this.depid,
                // f: "pjson"
            },
            success: this.getUserListCallback2.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    getUserListCallback2(results) {
        var that = this;
        if (results.code != 1) {
            that.toast.Show("查询用户信息出错！");
            console.log(results.message);
            return;
        }



        var users = this.domObj.find(".username").empty();
        var strusers = "<option value='' selected>全部</option>";
        $.each(results.result.rows, function (index, item) {
            strusers += "<option value=" + item.userid + " > " + item.username + " </option>";

        }.bind(this));
        users.append(strusers);


        this.domObj.find(".username").val(this.username);


    }



    //绑定权限当前部门用户
    bindgroup(userids) {
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken,
                // 'Token': AppX.appConfig.xjxj,
                // 'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.bindgroup,
            data: {
                "groupid": this.depid,
                "userids": userids,
                // f: "pjson"
            },
            success: this.bindgroupCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    bindgroupCallback(results) {
        var that = this;
        if (results.code != 10000) {
            that.toast.Show("查询web用户信息出错！");
            console.log(results.message);
            return;
        }

        //关闭popup,重新查询

        this.popup.Close();
        that.toast.Show(results.message);
        this.getWebUser2();










    }


    //绑定权限当前部门用户
    unbindgroup(userids) {
        $.ajax({
            headers: {
                'Authorization-Token': AppX.appConfig.usertoken,
                // 'Token': AppX.appConfig.xjxj,
                // 'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.apiroot.replace(/\/+$/, "") + this.config.unbindgroup,
            data: {
                "groupid": this.depid,
                "userids": userids,
                // f: "pjson"
            },
            success: this.unbindgroupCallback.bind(this),
            error: function (data) {
                this.toast.Show("服务端ajax出错，获取数据失败!");
            }.bind(this),
            dataType: "json",
        });
    }

    unbindgroupCallback(results) {
        var that = this;
        if (results.code != 10000) {
            that.toast.Show("查询web用户信息出错！");
            console.log(results.message);
            return;
        }

        //关闭popup,重新查询

        this.popup.Close();
        that.toast.Show(results.message);
        this.getWebUser2();










    }











    destroy() {

        this.domObj.remove();
        this.afterDestroy();
    }
}