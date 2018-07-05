import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');


export = SideMenu;

class SideMenu extends BaseWidget {
    baseClass = "widgets-side_menu";
    panels: Array<any> = new Array();
    fullpanels: Array<any> = new Array();
    halfpanels: Array<any> = new Array();
    mainContainer: JQuery;
    debug = false;
    toast: any;
    // 此函数在系统初始化完成后会自动调用
    //  所有业务逻辑从此函数开始
    startup() {
        // 异步获取 config
        // 可以在此做权限控制
        // (function (that) {
        //     $.ajax("//test.com", function (data) {
        //         that.start.apply(that,data);
        //     });
        // })(this);

        this.start();
    }

    start(config?) {
        this.addToDom({
            root: this.widgetPath,
            media: {
                foldImageURL: this.widgetPath + '/images/fold.png'
            },
            menuListData: this.config.menuListData || this.AppX.appConfig.menuBarWidgets
        });

        this.toast = this.AppX.runtimeConfig.toast;
        this.mainContainer = $(this.AppX.appConfig.mainContainer);

        // 初始化事件监听
        this.initDomListen();
        this.ready();
        this.AppX.runtimeConfig.SideMenu = this;
    }

    destroy() {

    }

    initDomListen() {
        this.domObj.find(".accordion").accordion({
            collapsible: true,
            active: false,
            heightStyle: "content",
            animate: 150,
            icons: {
                header: "glyphicon glyphicon-chevron-left",
                activeHeader: "glyphicon glyphicon-chevron-down"
            }
        });

        this.domObj.on('click', '.fire-on', (e) => {
            this.itemOnClick(e);
        });

        this.domObj.on('click', '.widgets-side_menu-footer-foldable-icon',
            (e) => {
                this.foldable(e);
            });

    }

    // 可折叠
    foldable(e) {
        var currentTarget = $(e.currentTarget);
        var isFold = currentTarget.data('isfold');
        if (isFold === true) {
            // 切换为展开
            this.domObj.removeClass('widgets-side_menu-sidebar-small');

            this.mainContainer.css({
                width: 'calc(100% - 250px)',
                left: '250px'
            });
        } else {
            // 切换为折叠
            this.domObj.addClass('widgets-side_menu-sidebar-small');

            this.mainContainer.css({
                width: 'calc(100% - 50px)',
                left: '50px'
            });
        }

        currentTarget.data('isfold', !isFold);
    }

    itemOnClick(e?) {
        var target = $(e.currentTarget);
        var panel = this.panels[target.data('id')];
        var fullpanel = this.fullpanels[target.data('id')];
        var halfpanel = this.halfpanels[target.data('id')];
        if (panel) {
            //*存在fullpanel，则关闭 */
            for (var p in this.fullpanels) {
                if (this.fullpanels[p] != null) {
                    this.fullpanels[p].destroyWidget();
                }
            }
            // this.toast.Show('模块[' + target.data('label') + ']正在使用当中!');
            if (panel.focus) {
                panel.focus();
            }


            // //存在fullpanel,則全部收縮
            // for (var p in this.fullpanels) {
            //     if (this.fullpanels[p] != null) {
            //         if (this.fullpanels[p].isFold == true) {
            //             //已经收缩则不再收缩
            //             return;
            //         }
            //         this.fullpanels[p].Fold();
            //     }
            // }
            return;
        }
        if (fullpanel) {
            // this.toast.Show('模块[' + target.data('label') + ']正在使用当中!');
            if (fullpanel.focus) {
                fullpanel.focus();
            }
            // //存在fullpanel,則全部收縮
            // for (var p in this.fullpanels) {
            //     if (this.fullpanels[p] != null) {
            //         if (this.fullpanels[p].isFold == true) {
            //             //已经收缩则不展开
            //             this.fullpanels[p].Fold();
            //             this.fullpanels[p].isFold = false;
            //         }
            //     }
            // }
            return;
        }

        if (halfpanel) {
            //*存在fullpanel，则关闭 */
            for (var p in this.fullpanels) {
                if (this.fullpanels[p] != null) {
                    this.fullpanels[p].destroyWidget();
                }
            }
            // this.toast.Show('模块[' + target.data('label') + ']正在使用当中!');
            if (halfpanel.focus) {
                halfpanel.focus();
            }
            return;
        }

        this.loadWidget(target);
    }

    loadWidget(target) {
        if (target.data('in-panel') === true) {
            if (target.data('panel') === "FullPanel") {

                // for (var p in this.fullpanels) {
                //     if (this.fullpanels[p] != null) {
                //         if (this.fullpanels[p].isFold == true) {
                //             this.fullpanels[p].Unfold();
                //         }

                //         // var curheight = this.fullpanels[p].fulpanelheight;
                //         // var btnfold = $($(this.fullpanels[p].domObj[0]).parent().parent().parent()[0]).find(".btnfold");
                //         // if (btnfold.hasClass('glyphicon-chevron-down') === true) {
                //         //     btnfold.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
                //         // }
                //         // else {
                //         //     btnfold.removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
                //         // }
                //         // for (var p in this.fullpanels) {
                //         //     if (this.fullpanels[p] != null) {
                //         //         if (this.fullpanels[p].isFold == true) {
                //         //             continue;
                //         //         }
                //         //         this.fullpanels[p].fulpanelheight = curheight;
                //         //     }
                //         // }
                //     }
                // }
                require({}, [Functions.concatUrl(this.config.fullpanelWidgetPath, this.config.panelWidgetMain)], (FullPanel) => {
                    this.log('加载面板模块:' + target.data('widget'));
                    // 新建一个fullpanel用于存放widget
                    this.fullpanels[target.data('id')] = new FullPanel({
                        widgetPath: this.config.fullpanelWidgetPath,
                        afterDestroyCallback: this.destroyWidget.bind(this, target.data('id'))
                    }, {
                            panelTitle: target.data('label'),
                            panelUniqClassName: target.data('id'),
                            innerWidgetPath: target.data('widget'),
                            innerWidgetMain: target.data('main')
                        });
                });

            }
            else if (target.data('panel') === "TerminalPanel") {
                require({}, [Functions.concatUrl(this.config.terminalWidgetPath, this.config.panelWidgetMain)], (TerminalPanel) => {
                    this.log('加载面板模块:' + target.data('widget'));
                    // 新建一个fullpanel用于存放widget
                    this.fullpanels[target.data('id')] = new TerminalPanel({
                        widgetPath: this.config.terminalWidgetPath,
                        afterDestroyCallback: this.destroyWidget.bind(this, target.data('id'))
                    }, {
                            panelTitle: target.data('label'),
                            panelUniqClassName: target.data('id'),
                            innerWidgetPath: target.data('widget'),
                            innerWidgetMain: target.data('main')
                        });
                });
            }
            else if (target.data('panel') === "HalfPanel") {
                // //存在fullpanel,則全部收縮
                // for (var p in this.fullpanels) {

                //     if (this.fullpanels[p] != null) {
                //         if (this.fullpanels[p].isFold == true) {
                //             //已经收缩则不再收缩
                //             break;
                //         }
                //         this.fullpanels[p].Fold();
                //         var curheight = this.fullpanels[p].fulpanelheight;
                //         // this.fullpanels[p].isFold = true;
                //         //换图标

                //         var btnfold = $($(this.fullpanels[p].domObj[0]).parent().parent().parent()[0]).find(".btnfold");

                //         if (btnfold.hasClass('glyphicon-chevron-down') === true) {
                //             btnfold.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-up');
                //         } else {
                //             btnfold.removeClass('glyphicon-chevron-up').addClass('glyphicon-chevron-down');
                //         }

                //         //当一个折叠了，其他成员自动也折叠

                //         for (var p in this.fullpanels) {
                //             if (this.fullpanels[p] != null) {
                //                 if (this.fullpanels[p].isFold == false) {
                //                     //已经收缩则不再收缩
                //                     // continue;
                //                     this.fullpanels[p].isFold = true;
                //                 }

                //                 this.fullpanels[p].fulpanelheight = curheight;
                //             }
                //         }




                //     }

                // }

                //*存在fullpanel，则关闭 */
                for (var p in this.fullpanels) {
                    if (this.fullpanels[p] != null) {
                        //关闭fullpanels
                        this.fullpanels[p].destroyWidget();
                        //this.fullpanels[p]=null;
                    }

                }
                //存在halfpanel,則关闭


                // for (var Key in this.halfpanels) {
                //     if (this.halfpanels[Key] != null && this.halfpanels[Key] != undefined) {
                //         // console.log(this.halfpanels[Key]);
                //         // this.halfpanels[Key].destroy();
                //         // this.halfpanels[Key].widgetObj.destroy();
                //         this.halfpanels[Key].destroyWidget();
                //     }

                // }


                require({}, [Functions.concatUrl(this.config.halfpanelWidgetPath, this.config.panelWidgetMain)], (HalfPanel) => {
                    this.log('加载面板模块:' + target.data('widget'));
                    // 新建一个halfpanel用于存放widget
                    this.halfpanels[target.data('id')] = new HalfPanel({
                        widgetPath: this.config.halfpanelWidgetPath,
                        afterDestroyCallback: this.destroyWidget.bind(this, target.data('id'))
                    }, {
                            panelTitle: target.data('label'),
                            panelUniqClassName: target.data('id'),
                            innerWidgetPath: target.data('widget'),
                            innerWidgetMain: target.data('main')
                        });
                });

            }
            else {

                //存在fullpanel,則全部收縮
                // for (var p in this.fullpanels) {
                //     if (this.fullpanels[p] != null) {
                //         this.fullpanels[p].Fold();
                //         this.fullpanels[p].isFold = true;
                //     }
                // }

                // for (var p in this.fullpanels) {
                //     if (this.fullpanels[p] != null) {
                //         if (this.fullpanels[p].isFold == false) {
                //             //没折叠则折叠
                //             this.fullpanels[p].Fold();
                //             // this.fullpanels[p].isFold = true;
                //         }

                //     }
                // }
                /*存在fullpanel，则关闭 */
                for (var p in this.fullpanels) {
                    if (this.fullpanels[p] != null) {
                        //关闭fullpanels
                        this.fullpanels[p].destroyWidget();
                        //this.fullpanels[p]=null;
                    }

                }

                var panelcount = 0;
                for (var p in this.panels) {
                    if (this.panels[p] != null) {
                        panelcount += 1;
                    }

                }


                require({}, [Functions.concatUrl(this.config.panelWidgetPath, this.config.panelWidgetMain)], (Panel) => {
                    this.log('加载面板模块:' + target.data('widget'));
                    // 新建一个panel用于存放widget
                    this.panels[target.data('id')] = new Panel({
                        widgetPath: this.config.panelWidgetPath,
                        afterDestroyCallback: this.destroyWidget.bind(this, target.data('id'))
                    }, {
                            panelTitle: target.data('label'),
                            panelUniqClassName: target.data('id'),
                            innerWidgetPath: target.data('widget'),
                            innerWidgetMain: target.data('main'),
                            panelcount: panelcount
                        });
                });

            }

        } else {
            require({}, [Functions.concatUrl(target.data('widget'), target.data('main'))], (Widget) => {
                this.log('加载模块:' + target.data('widget'));
                this.panels[target.data('id')] = new Widget({
                    widgetPath: target.data('widget'),
                    afterDestroyCallback: this.destroyWidget.bind(this, target.data('id'))
                });
            });
        }
    }

    destroyWidget(widgetID) {
        this.panels[widgetID] = null;
        this.fullpanels[widgetID] = null;
        this.halfpanels[widgetID] = null;
        this.log('已销毁对象:ID = ' + widgetID);
    }

    addToDom(data) {
        var htmlString = _.template(this.template)(data);
        this.setHtml(htmlString, '.body');
    }
    /**
    * (方法说明)加载指定模块
    * @method (方法名)
    * @for (所属类名)提供给外部调用，加载指定模块集合
    * @param {(参数类型)} (参数名) (参数说明)configs-模块配置集合
    * @return {(返回值类型)} (返回值说明)
    */
    loadWidgets(configs: Array<any>) {
        configs.forEach(function (item, index) {
            if (item.inPanel === true) {
                if (item.panel === "FullPanel") {
                    require({}, [Functions.concatUrl(this.config.fullpanelWidgetPath, this.config.panelWidgetMain)], (FullPanel) => {
                        this.log('加载面板模块:' + item.id);
                        // 新建一个fullpanel用于存放widget
                        this.fullpanels[item.id] = new FullPanel({
                            widgetPath: this.config.fullpanelWidgetPath,
                            afterDestroyCallback: this.destroyWidget.bind(this, item.id)
                        }, {
                                panelTitle: item.label,
                                panelUniqClassName: item.id,
                                innerWidgetPath: item.widget,
                                innerWidgetMain: item.main
                            });
                    });
                }
                else if (item.panel === "TerminalPanel") {
                    require({}, [Functions.concatUrl(this.config.terminalWidgetPath, this.config.panelWidgetMain)], (TerminalPanel) => {
                        this.log('加载面板模块:' + item.widget);
                        // 新建一个fullpanel用于存放widget
                        this.fullpanels[item.id] = new TerminalPanel({
                            widgetPath: this.config.terminalWidgetPath,
                            afterDestroyCallback: this.destroyWidget.bind(this, item.id)
                        }, {
                                panelTitle: item.label,
                                panelUniqClassName: item.id,
                                innerWidgetPath: item.widget,
                                innerWidgetMain: item.main
                            });
                    });
                }
                else if (item.panel === "HalfPanel") {
                    //*存在fullpanel，则关闭 */
                    for (var p in this.fullpanels) {
                        if (this.fullpanels[p] != null) {
                            //关闭fullpanels
                            this.fullpanels[p].destroyWidget();
                            //this.fullpanels[p]=null;
                        }

                    }
                    // //存在halfpanel,則关闭


                    // for (var Key in this.halfpanels) {
                    //     if (this.halfpanels[Key] != null && this.halfpanels[Key] != undefined) {
                    //         this.halfpanels[Key].destroyWidget();
                    //     }
                    // }
                    require({}, [Functions.concatUrl(this.config.halfpanelWidgetPath, this.config.panelWidgetMain)], (HalfPanel) => {
                        this.log('加载面板模块:' + item.widget);
                        // 新建一个halfpanel用于存放widget
                        this.halfpanels[item.id] = new HalfPanel({
                            widgetPath: this.config.halfpanelWidgetPath,
                            afterDestroyCallback: this.destroyWidget.bind(this, item.id)
                        }, {
                                panelTitle: item.label,
                                panelUniqClassName: item.id,
                                innerWidgetPath: item.widget,
                                innerWidgetMain: item.main
                            });
                    });
                }
                else {
                    /*存在fullpanel，则关闭 */
                    for (var p in this.fullpanels) {
                        if (this.fullpanels[p] != null) {
                            //关闭fullpanels
                            this.fullpanels[p].destroyWidget();
                        }
                    }

                    require({}, [Functions.concatUrl(this.config.panelWidgetPath, this.config.panelWidgetMain)], (Panel) => {
                        this.log('加载面板模块:' + item.widget);
                        // 新建一个panel用于存放widget
                        this.panels[item.id] = new Panel({
                            widgetPath: this.config.panelWidgetPath,
                            afterDestroyCallback: this.destroyWidget.bind(this, item.id)
                        }, {
                                panelTitle: item.label,
                                panelUniqClassName: item.id,
                                innerWidgetPath: item.widget,
                                innerWidgetMain: item.main
                            });
                    });
                }
            } else {
                require({}, [Functions.concatUrl(item.widget, item.main)], (Widget) => {
                    this.log('加载模块:' + item.widget);
                    this.panels[item.id] = new Widget({
                        widgetPath: item.widget,
                        afterDestroyCallback: this.destroyWidget.bind(this, item.id)
                    });
                });
            }
        }.bind(this));
    }
}