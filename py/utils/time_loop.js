// Example of a while loop to loop over every date
var start = ee.Date.fromYMD(2016, 1, 1);
var end = ee.Date.fromYMD(2017, 1, 1);
var end_i = start.advance(1,"month");
while (end.difference(end_i,"month").getInfo()>=0) {
  end_i = end_i.advance(1,"month");
  var str = "water_".concat((end_i.getInfo().value/1000).toString());
  print(str);
}
