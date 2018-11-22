$(function() {
    "use strict";
    $('.year-calendar').pignoseCalendar({
        theme: 'blue' // light, dark, blue
    });

    $('input.calendar').pignoseCalendar({
        format: 'DD-MM-YYYY' // date format string. (2017-02-02)
    });
});

