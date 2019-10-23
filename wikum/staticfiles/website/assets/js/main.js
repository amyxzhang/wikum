$(document).ready(function ($) {
    'use strict';


/* ---------------------------------------------
     page  Prealoader
 --------------------------------------------- */
    $(window).on('load', function () {
        $("#loading-center-page").fadeOut();
        $("#loading-page").delay(400).fadeOut("slow");
    });


});

/* ---------------------------------------------
 owl caroussel
 --------------------------------------------- */

$('.screenshot_slider').owlCarousel({
    loop: true,
    responsiveClass: true,
    nav: true,
    margin: 1,
    autoplay: true,
    autoplayTimeout: 4000,
    items: 3,
    smartSpeed: 500,
    autoWidth:true,
    center: true,
    navText: ['<span class="icon-arrow-left"></span>', '<span class="icon-arrow-right"></span>'],
    responsive: {
        0: {
            items: 1,
        },
        600: {
            items: 3
        },
        1200: {
            items: 3,
            
        }
    }
});


$('.testimonial-caroussel').owlCarousel({
    loop: true,
    responsiveClass: true,
    nav: true,
    autoplay: true,
    autoplayTimeout: 4000,
    smartSpeed: 500,
    center: true,
    navText: ['<span class="icon-arrow-left"></span>', '<span class="icon-arrow-right"></span>'],
    responsive: {
        0: {
            items: 1,
        },
        600: {
            items: 1

        },
        1200: {
            items: 1
        }
    }
});


/*--------------------
 MAGNIFIC POPUP JS
 ----------------------*/
$('.popup-image').magnificPopup({
    type: 'image',
    removalDelay: 300,
    mainClass: 'mfp-with-zoom',
    gallery: {
        enabled: true
    },
    zoom: {
        enabled: true,

        duration: 300,
        easing: 'ease-in-out',

        opener: function (openerElement) {

            return openerElement.is('img') ? openerElement : openerElement.find('img');
        }
    }
});

/* ---------------------------------------------
 Back top page scroll up
 --------------------------------------------- */


$.scrollUp({
    scrollText: '<i class="icon-arrow-up"></i>',
    easingType: 'linear',
    scrollSpeed: 900,
    animation: 'fade'
});


/* ---------------------------------------------
 WoW plugin
 --------------------------------------------- */

new WOW().init({
    mobile: true,
});

/* ---------------------------------------------
 Smooth scroll
 --------------------------------------------- */

  $('a.section-scroll[href*="#"]:not([href="#"])').on('click', function (event) {
    if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '')
        || location.hostname == this.hostname) {

        var target = $(this.hash);
        target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
        if (target.length) {
            // Only prevent default if animation is actually gonna happen
        event.preventDefault();
            $('html,body').animate({
                scrollTop: target.offset().top
            }, 750);
            return false;
        }
    }
});


/*----------------------------------------
 Newsletter Subscribe
 --------------------------------------*/


    $(".subscribe-mail").ajaxChimp({
        callback: mailchimpCallRep,
        url: "mailchimp-post-url" //Replace this with your own mailchimp post URL. Just paste the url inside "".
    });

function mailchimpCallRep(resp)
{
    if (resp.result === "success") {
        $(".sucess-message").html(resp.msg).fadeIn(1000);
        $(".error-message").fadeOut(500);
    } else if (resp.result === "error") {
        $(".error-message").html(resp.msg).fadeIn(1000);
    }
}

