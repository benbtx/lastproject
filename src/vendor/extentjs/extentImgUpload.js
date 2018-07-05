/**
 * ImgUpload
 * @param ele [string] [生成组件的元素的选择器]
 * @param options [Object] [对组件设置的基本参数]
 * options具体参数如下
 * path 图片上传的地址路径 必需
 * num 图片限制数量 必需
 * pics 默认图片集合 非必填
 * pic_ids 默认图片集合的ids 非必填，与pics一一对应
 * onSuccess(res) 文件上传成功后的回调 参数为返回的文本 必需
 * onFailure(res) 文件上传失败后的回调 参数为返回的文本 必需
 * @return [function Object] [{uploadImg:执行图片上传的函数,checkImgSize:检查图片数据大小}]
 * 调用方法
 * ImgUpload('div', options)
 * options.recallfunc----重复图片提示回调函数
 * options.onlyshow-----只是显示控件
 */
function ImgUpload(ele, options) {
    options.isupdate=false;
    options.deleteicon="";
    
    $("<link>").attr({rel:"stylesheet",type:"text/css",href:"./vendor/extentjs/css/extentImgUpload.css"}).appendTo("head");
    if(options.pics==undefined || options.pics==null){
        options.pics=[];
    }
    options.currentnum=options.pics.length;
    // 判断容器元素合理性并且添加基础元素
    var eleList = document.querySelectorAll(ele);
    if(eleList.length == 0){
        return;
    }else if(eleList.length>1){        
        return;
    }else {
        var ismultiple="";
        if(options.num>1){
            ismultiple="multiple";
        }
        if(options.onlyshow!=undefined &&options.onlyshow==true){
            if(options.pics.length==0){
                eleList[0].innerHTML ='<div id="img-container" >'+
                '<div class="img-up-add  img-item" ><span class="img-add-icon" style="display:none;">+</span> </div>'+
                '<input type="file" accept="image/jpeg,image/jpg,image/png|.jpeg,.jpg,.png" name="files" id="img-file-input"></div>';
            }else{
                 eleList[0].innerHTML ='<div id="img-container" ></div>';
            }
        }else{
            eleList[0].innerHTML ='<div id="img-container" >'+
                '<div class="img-up-add  img-item" ><span class="img-add-icon" title="点击添加图片(*.jpg|*.png)">+</span> </div>'+
                '<input type="file" accept="image/jpeg,image/jpg,image/png|.jpeg,.jpg,.png" name="files" id="img-file-input"></div>';
        }
        
        var ele = eleList[0].querySelector('#img-container');
        ele.files = [];   // 当前上传的文件数组
    }

    // 为添加按钮绑定点击事件，设置选择图片的功能
    var addBtn = document.querySelector('.img-up-add');
    if(!(options.onlyshow!=undefined &&options.onlyshow==true))
        addBtn.addEventListener('click',function () {
            document.querySelector('#img-file-input').value = null;
            document.querySelector('#img-file-input').click();
            return false;
        },false)
    
    // -----------------------------------------预览图片-------------------------
    //加载默认图片
    for(var ki=0;ki<options.pics.length;ki++){
        var picurl=options.pics[ki];
        var id=options.pic_ids?options.pic_ids[ki]:ki;
        loadFile(picurl,id);
        if(options.num==(ki+1)){
            $('.img-up-add').hide();
            break;
        }
    }

    function loadFile(picurl,idx){
        var oDiv = document.createElement('div');
        oDiv.className = 'img-thumb img-item';                       
        oDiv.innerHTML = '<ul class="img_upload_ul"><li><img class="thumb-icon" src="'+picurl+'" /></li><ul>'+
                        '<img class="img-remove" '+(options.onlyshow!=undefined &&options.onlyshow==true?'style="display:none;"':"")+' data-idx="'+idx+'"  src="./vendor/extentjs/images/x_alt.png" title="移除"/> '
        
        ele.insertBefore(oDiv, addBtn);
        addImgClick();   
    }

    function addImgClick(){
        var imgBtn = document.querySelector('.thumb-icon');
        imgBtn.addEventListener('click',function () {
            $('.img_upload_ul').viewer({
                title:0,
                navbar:0
            });               
            return false;
        },false)
    }

    //处理input选择的图片
    function handleFileSelect(evt) {
        options.isupdate=true;
        var files = evt.target.files;
        for(var i=0, f; f=files[i];i++){
            if(!f.type.match('image.*')){//!f.type.match('image.*')
                continue;
            }
            // 过滤掉重复上传的图片
            var tip = false;
            for(var j=0; j<(ele.files).length; j++){
                if((ele.files)[j].name == f.name){
                    tip = true;
                    break;
                }
            }
            if(!tip){               
                // 图片文件绑定到容器元素上
                ele.files.push(f);
                
                var reader = new FileReader();
                reader.onload = (function (theFile) {
                    return function (e) {
                        
                        var oDiv = document.createElement('div');
                        oDiv.className = 'img-thumb img-item';
                        // 向图片容器里添加元素
                        oDiv.innerHTML = '<ul class="img_upload_ul"><li><img class="thumb-icon" src="'+e.target.result+'" /></li><ul>'+
                                        '<img class="img-remove"  src="./vendor/extentjs/images/x_alt.png" title="移除"/> '//'<a href="javscript:;" class="img-remove">x</a>'

                        ele.insertBefore(oDiv, addBtn);   
                        addImgClick();
                        options.currentnum=options.currentnum+1;
                        if(options.num==options.currentnum){
                            $('.img-up-add').hide();
                        }                    
                    };
                })(f);

                reader.readAsDataURL(f);
            }else{
                if(options.recallfunc!=undefined && options.recallfunc){
                    options.recallfunc();
                }
            }
        }
    }
    if(!(options.onlyshow!=undefined &&options.onlyshow==true))
        document.querySelector('#img-file-input').addEventListener('change', handleFileSelect, false);

    // 删除图片
    function removeImg(evt) { 
        options.isupdate=true;       
        if(evt.target.className.match(/img-remove/)){
            function getIndex(ele){
                if(ele && ele.nodeType && ele.nodeType == 1) {
                    var oParent = ele.parentNode;
                    var oChilds = oParent.children;
                    for(var i = 0; i < oChilds.length; i++){
                        if(oChilds[i] == ele){                            
                            return i;                            
                        }                            
                    }
                }else {
                    return -1;
                }
            }
            // 根据索引删除指定的文件对象
            var index = getIndex(evt.target.parentNode);
            var idx=$(evt.target).data("idx");
            if(idx !=undefined){
                 options.deleteicon+=idx+',';                 
            }            
            ele.removeChild(evt.target.parentNode.parentNode.parentNode);
            options.currentnum=options.currentnum-1;
            if(index < 0){
                return;
            }else {
                ele.files.splice(index, 1);
            }    
            $('.img-up-add').show();       
        }
    }
    if(!(options.onlyshow!=undefined &&options.onlyshow==true))
        ele.addEventListener('click', removeImg, false);

    /**
     * @function 上传图片
     * @param opt{datas:[],url:url,Token:Token,departmentid:departmentid,success:success,error:error}
     */
    function uploadImg(opt) {
        var xhr = new XMLHttpRequest();
        var formData = new FormData();

        if(ele.files.length==0 && options.isupdate==true){
            formData.append("clearIcon",true);             
        }
        
        if(options.isupdate==true){          
            for(var i=0, f; f=ele.files[i]; i++){
                formData.append('files', f);                      
            }
        }

        for(var j=0;j<opt.datas.length;j++){
            formData.append(opt.datas[j].name,opt.datas[j].value);
        }
        
        formData.append("deleteicon", options.deleteicon);
        console.log( options.deleteicon);
        xhr.onreadystatechange = function (e) {
            if(xhr.readyState == 4){
                console.log( xhr.responseText);
                if(xhr.status == 200){                   
                    opt.success(xhr.responseText);
                }else {
                    opt.error(xhr.responseText);
                }
            }
        }
        xhr.open('POST', opt.url, true);
        xhr.setRequestHeader("Token",opt.Token);
        xhr.setRequestHeader("departmentid",opt.departmentid);   
        xhr.send(formData);
    }

    /**
     * @function 检查图片数据大小
     * @param maxsize 图片大小，单位kb
     */
    function checkImgSize(maxsize) {
        var ischeck=true;
        for(var i=0, f; f=ele.files[i]; i++){
            var imgSize=f.size;
            if(imgSize>maxsize*1024){
                ischeck=false;
                break;
            }
        }
        return ischeck;
    }
    return {uploadImg:uploadImg,checkImgSize:checkImgSize};
}

