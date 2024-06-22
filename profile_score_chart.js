$(function () {
    
  $('#container').highcharts({
      
    chart: {
        polar: true,
        type: 'line'
    },
    credits: {
    enabled: false
  },
    title: {
        text: ''
    },
    
    pane: {
        startAngle: 0,
        endAngle: 360
    },

    xAxis: {
      type: 'category',
        tickInterval: 1,
        categories: ['프론트엔드', '백엔드', '디자이너', 'IOS', '안드로이드', '데브옵스','PM', '기획자', '마케터'],
        min: 0,
        max: 9,
        tickmarkPlacement: 'on',

        lineWidth: 0,
        labels: {
          formatter: function () {
            return this.value
          }
        },

    },
     tooltip: {
          shared: true,
          useHTML: true,
          headerFormat: '<div class="newTip"><big>{point.key}</big>' + '<br/>',
          pointFormat: '{point.y} / 5.0',
          footerFormat: '</div>',
          valueDecimals: 1
      },
    yAxis: {
        gridLineInterpolation: 'polygon',
        min: 0,
        max: 5,
        tickInterval: 1,
    minorTickInterval: 0.5,
    showLastLabel: 'true',
    labels:{
        x: 8,
      style: {
        color: '#000',
        textShadow:'1px 1px 0px #fff',
        display: "inline-block"
        }				
    },
    
    },
    
    plotOptions: {
        series: {
            pointStart: 0,
            pointInterval: 1,

        },
        column: {
            pointPadding: 0,
            groupPadding: 0
        }
    },

    series: [{
        type: 'area',
        name: 'Skills',
        data: [4, 5, 3, 5, 3, 4, 5, 3],
        pointPlacement: "on"
    }]
});
});