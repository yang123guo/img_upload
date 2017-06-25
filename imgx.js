/**
 * Created by l on 16/11/1.
 * 暂只支持自动上传，通过监听input[type=file]的onchange实现，手动上传功能后续添加
 * 只支持上传单图片
 */
(function(w, d){
    //工具函数
    var t = {
        attr: function(node, map){
            for(var name in map){
                node.setAttribute(name, map[name]);
            }
            return node;
        },
        generateInput: function(id){
            var input = t.attr(
            document.createElement('input'),
            {
                type: 'file',
                accept: 'image/*',
                id : id
                // multiple="multiple"  暂不支持多图片上传，后续支持
            }
            ) ;
            input.style.display = 'none' ;
            return input ;
        },
        checkType: function () {
            return /image\/\w+/.test(this.input.files[0].type) ;
        },
        setHeader: function ( xhr, header ) {
            for (var k in header) {
                xhr.setRequestHeader( k, header[k] );
            }
        }
    } ;

    //默认参数
    var config = {
        wrap: d.body,
        maxSize: 1024 * 1024 * 1
    } ;


    /**
     * @param args {url, pick, wrap, progress, loaded, thumbnail}
     * @constructor
     */
    var Imgx = function( args ){

        this.args = args;
        this.id = new Date().getTime();
        this.picker = typeof args.pick == 'string' ? d.querySelector( args.pick ) : args.pick ;
        this.wrap = args.wrap ? (typeof args.wrap == 'string' ? d.querySelector( args.wrap ) : args.wrap) : config.wrap ;
        this.xhr = new XMLHttpRequest() ;
        this.files = [] ;  //保存自建对象
        this.header = args.header ;
        this.init() ;
        

    }
    Imgx.prototype = {
        init: function () {
            var self = this ;
            //绑定选择图片按钮处理程序
            this.picker.addEventListener('click', function () {
                this.files.push({
                    xhr: new XMLHttpRequest(),
                    input: t.generateInput(new Date().getTime())
                }) ;
                var file = this.files[this.files.length - 1] ;
                this.wrap.appendChild( file.input ) ;
                self.bindEvents().call( file ) ;
                file.input.onchange = this.change().bind(file) ;
                this.files[this.files.length - 1].input.click() ;
            }.bind(this), false) ;

        },
        bindEvents: function () {
            var self = this ;
            var progressHandler = function (evt) {
                if (evt.lengthComputable) {
                    var result = {loaded: evt.loaded, total: evt.total, per: (evt.loaded / evt.total * 100).toFixed(2) } ;
                    self.progressCb(result, this) ;
                }
            } ;
            var loadedHandler = function () {
                this.result = JSON.parse(this.xhr.responseText) ;
                self.loadedCb(this.result, this) ;
            } ;
            return function () {
                if ( self.progressCb ) {
                    this.xhr.upload.onprogress =  progressHandler.bind( this ) ;
                }

                if ( self.loadedCb ) {
                 this.xhr.onload = loadedHandler.bind( this ) ;
                }

            }
        },
        //负责接收上传进度的回调函数
        progress: function ( progressCb ) {
            this.progressCb = progressCb || new Function() ;
        },
        //接收上传结束的回调函数
        loaded: function ( loadedCb ) {
            this.loadedCb = loadedCb || new Function() ;
        },
        //缩略图处理
        thumbnail: function ( thumbnailCb ) {
            this.thumbnailCb = thumbnailCb || new Function() ;
        },      
        //缩略图, 基于FileReader生成base64编码，后期添加压缩功能
        doThumbnail: function () {
            var self = this ;
            return function () {
                // this = file
                var me = this;
                //不支持多选
                var file = me.input.files[0],
                reader = new FileReader() ;
                var info = me.info = {
                    size:{
                        B: file.size,
                        KB: (Math.round(file.size * 100/ 1024) / 100).toString(),
                        MB: (Math.round(file.size * 100/ (1024 * 1024)) / 100).toString()
                    },
                    name: file.name,
                    type: file.type
                } ;

                //读取完图片后检查图片大小，若启用压缩功能，则取消此检查 ...未完成
                // if( me.info.size.B <= config.maxSize ){
                   reader.readAsDataURL( file ) ;
                    reader.onload = function () {
                        var result = this.result 
                        info.base64 = result ;                        
                        //获取图片真实宽高
                        var img = d.createElement('img') ;                        
                        img.src = result;
                        info.h = img.naturalHeight ;
                        info.w = img.naturalWidth ;

                        if( me.info.size.B <= config.maxSize ){
                            img = null ;
                            self.thumbnailCb( me.info, me ) ;
                            reader = null ;
                            self.up(result, info.type , info.name).call(me) ;
                        }else{
                            self.thumbnailCb( me.info, me );
                            
                            if (img.completee) {
                                var compressData = self.compress(img);
                                self.up(compressData, info.type , info.name).call(me) ;
                            } else {
                                img.addEventListener('load', function(){
                                    var compressData = self.compress(img);
                                    self.up(compressData, info.type , info.name).call(me) ;
                                })
                                img.addEventListener('error', function() {
                                    alert('error');
                                })
                            }
                        }
                    } ;
                } 
        },
        //选择图片处理
        change: function () {
            var self = this ;
            return function () {
                // this = file
                var me = this ;
                if( !t.checkType.call( this ) ) {
                    return false ;
                }
                this.formData = new FormData() ;
                // 通过fileReader读取文件信息
                self.doThumbnail().call( this ) 
            }
        },
        up: function (basestr, type , name) {
            var self = this ;
            // complete   Imgx {args,id,picker,wrap}
            // load       Imgx {args,id,picker,wrap}
            return function () {
                // var text = window.atob(basestr.split(",")[1]);
                // var buffer = new Uint8Array(text.length);
                // var pecent = 0, loop = null;

                // for (var i = 0; i < text.length; i++) {
                //   buffer[i] = text.charCodeAt(i);
                // }
                // var blob = self.getBlob([buffer], type);
                // console.info(blob);
                // this.formData.append("base64data", basestr);
                // this.formData.append("item_class", 'UserRequest') ;
                // this.formData.append("fileName", name) ;
                // this.formData.append("mimetype", type) ;

                // var i = 0,
                // len = this.input.files.length ;                
                // while (i < len){
                //     console.info(this.input.files[i]);
                //     this.formData.append("file" + i, this.input.files[i]) ;
                //     i++;

                // }
                type = encodeURIComponent(type);
                name = encodeURIComponent(name);
                var newbasestr =  basestr.replace(/^.*?,/,'');                
                basestr = encodeURIComponent(newbasestr);
                
                this.xhr.open("post", self.args.url.replace('{mimetype}',type).replace('{filename}',name), true) ;
                t.setHeader( this.xhr, self.header ) ;                
                this.xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded"); 
                var request = JSON.stringify({"base64data" : basestr});
                this.xhr.send(request) ;                
            } ;
        },
        destroy: function () { },

        getBlob : function (buffer, format) {
            try {
              return new Blob(buffer, {type: format});
            } catch (e) {
              var bb = new (window.BlobBuilder || window.WebKitBlobBuilder || window.MSBlobBuilder);
              buffer.forEach(function(buf) {
                bb.append(buf);
              });
              return bb.getBlob(format);
            }
        },

        compress : function ( img ) {
            var initSize = img.src.length;
            var width = img.width;
            var height = img.height;
            var canvas = document.createElement("canvas");
              var ctx = canvas.getContext('2d');

              //    瓦片canvas
              var tCanvas = document.createElement("canvas");
              var tctx = tCanvas.getContext("2d");

            // 如果图片大于四百万像素，计算压缩比并将大小压至400万以下
            var ratio; // 压缩比
            if ((ratio = width * height / 4000000)>1) {
                ratio = Math.sqrt(ratio);
                width /= ratio;
                height /= ratio;
            }else {
                ratio = 1;
            }

            canvas.width = width;
            canvas.height = height;

    //        铺底色
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            //如果图片像素大于100万则使用瓦片绘制
            var count;
            if ((count = width * height / 1000000) > 1) {
                count = ~~(Math.sqrt(count)+1); //计算要分成多少块瓦片

    //            计算每块瓦片的宽和高
                var nw = ~~(width / count);
                var nh = ~~(height / count);

                tCanvas.width = nw;
                tCanvas.height = nh;

                for (var i = 0; i < count; i++) {
                    for (var j = 0; j < count; j++) {
                        tctx.drawImage(img, i * nw * ratio, j * nh * ratio, nw * ratio, nh * ratio, 0, 0, nw, nh);

                        ctx.drawImage(tCanvas, i * nw, j * nh, nw, nh);
                    }
                }
            } else {
                ctx.drawImage(img, 0, 0, width, height);
            }

            //进行最小压缩
            var ndata = canvas.toDataURL("image/jpeg", 0.1);

            console.log("压缩前：" + initSize);
            console.log("压缩后：" + ndata.length);
            console.log("压缩率：" + ~~(100 * (initSize - ndata.length) / initSize) + "%");
            tCanvas.width = tCanvas.height = canvas.width = canvas.height = 0;
            return ndata;
        }

    }

    Imgx.prototype.constructor = Imgx ;
    w.Imgx = Imgx ;

})(window, document);