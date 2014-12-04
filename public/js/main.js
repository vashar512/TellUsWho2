var jumboHeight = $('.intro-body').outerHeight();
function parallax(){
    var scrolled = $(window).scrollTop();
    $('.intro').css('height', (jumboHeight-scrolled) + 'px');
}

$(window).scroll(function(e){
    parallax();
});