function strip_tags(str){
	const tags = ['a', 'em', 'div', 'span', 'p', 'i', 'button', 'img' ];
	const tagsAndContent = ['picture', 'script', 'noscript', 'source'];  	 
	for(tag of tagsAndContent){ 
		let regex = new RegExp( '<' + tag+ '.*?</' + tag + '>', 'gim');
		str = str.replace( regex ,"");
	}
	for(tag of tags){
		let regex1 = new RegExp( '<' + tag+ '.*?>', 'gim');
		let regex2 = new RegExp( '</' + tag+ '>', 'gim');
		str = str.replace(regex1,"").replace(regex2,""); 
	} 
	return str;
}
var regex_img = /data-image="[^"]+"/gm;
var regex_descr = /data-description="[^"]+"/gm;
var regex_name = /data-name="[^"]+"/gm;
var regex_video = /data-video(="[^"]+")?/gm;
var regex_class = /class="[^"]+"/gm;

function strip_attr(str){
	return str = str.replace(regex_img, '').replace(regex_descr, '').replace(regex_name, '').replace(regex_video, '').replace(regex_class, ''); 
}
function strip_all(str){
	return strip_attr( strip_tags(str) );
}

function unescape_html(str){ 
	if (str){ 
	    replacer={'&#xF6;': 'ö', '&ouml;': 'ö',
				  '&#xE4;': 'ä', '&auml;': 'ä', 
				  '&#xFC;': 'ü', '&uuml;': 'ü', 
				  '&#xEB;': 'ë', '&euml;': 'ë',
				  '&#xDF;': 'ß','&szlig;': 'ß',
				  '&amp;': '&',
				  '&#xA0;': ' ', '&nbsp;': ' '
		};
		for (const [key, value] of Object.entries(replacer)) {
			//console.log(`${key}: ${value}`);
			while (str.indexOf(key)!= -1){
				str = str.replace(key, value);
			} 
		} 
		return str;
	} else {
		return '';
	}
}
module.exports = { strip_tags, strip_attr, strip_all, unescape_html }