(function ($) {
	'use strict';

	// Preloader js    
	$(window).on('load', function () {
		$('.preloader').fadeOut(100);
	});

	// Background-images
	$('[data-background]').each(function () {
		$(this).css({
			'background-image': 'url(' + $(this).data('background') + ')'
		});
	});

	//  Search Form Open
	$('#searchOpen').on('click', function () {
		$('.search-wrapper').addClass('open');
		setTimeout(function () {
			$('.search-box').focus();
		}, 400);
	});
	$('#searchClose').on('click', function () {
		$('.search-wrapper').removeClass('open');
	});

	//Hero Slider
	$('.hero-slider').slick({
		autoplay: true,
		infinite: true,
		arrows: true,
		prevArrow: '<button type=\'button\' class=\'prevArrow\'></button>',
		nextArrow: '<button type=\'button\' class=\'nextArrow\'></button>',
		dots: false,
		autoplaySpeed: 7000,
		pauseOnFocus: false,
		pauseOnHover: false
	});
	$('.hero-slider').slickAnimation();

	//  Count Up
	function counter() {
		var oTop;
		if ($('.count').length !== 0) {
			oTop = $('.count').offset().top - window.innerHeight;
		}
		if ($(window).scrollTop() > oTop) {
			$('.count').each(function () {
				var $this = $(this),
					countTo = $this.attr('data-count');
				$({
					countNum: $this.text()
				}).animate({
					countNum: countTo
				}, {
					duration: 1000,
					easing: 'swing',
					step: function () {
						$this.text(Math.floor(this.countNum));
					},
					complete: function () {
						$this.text(this.countNum);
					}
				});
			});
		}
	}
	$(window).on('scroll', function () {
		counter();
	});

	// venobox popup
	$('.venobox').venobox();

	//testimonial slider
	$('.testimonial-slider').slick({
		slidesToShow: 1,
		slidesToScroll: 1,
		autoplay: true,
		autoplaySpeed: 6000,
		dots: false,
		arrows: true,
		prevArrow: '<button type=\'button\' class=\'prevArrow\'></button>',
		nextArrow: '<button type=\'button\' class=\'nextArrow\'></button>',
		pauseOnFocus: false,
		pauseOnHover: false
	});

	// filter
	$(document).ready(function () {
		var containerEl = document.querySelector('.filtr-container');
		var filterizd;
		if (containerEl) {
			filterizd = $('.filtr-container').filterizr({});
		}
		//Active changer
		$('.filter-controls li').on('click', function () {
			$('.filter-controls li').removeClass('active');
			$(this).addClass('active');
		});
	});

	// Accordions
	$('.collapse').on('shown.bs.collapse', function () {
		$(this).parent().find('.fa-plus').removeClass('fa-plus').addClass('fa-minus');
	}).on('hidden.bs.collapse', function () {
		$(this).parent().find('.fa-minus').removeClass('fa-minus').addClass('fa-plus');
	});

	// Blog Img 
	$('.blog .content img').on('click', function (e) {
		BigPicture({
			el: e.target,
		})
	})

})(jQuery);