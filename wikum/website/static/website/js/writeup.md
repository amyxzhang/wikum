# A4-Keys-to-Happiness Writeup

## Design Choice Rationale
We chose to use a world map coupled with a timeline to visualize how a particular measure of happiness varies by country over the years 2015-2019. By default, the map shows data for 2019, but clicking on a different year will reload the map with that year's data. The happiness score is calculated using six factors, economic production, social support, life expectancy, freedom, absence of corruption, and generosity, as explained in the information modal. To show how these vary by country and over the years, a user can also select the specific factor from the top, which are color coded by factor in the map. Tooltips on these symbols help the user see which symbol corresponds to which factor and the indigo box on the symbol, as well as the indigo highlight on the year represent selection. Hovering over any country will show the associated value, given the year and happiness factor. The darkness of the color encodes the factor score, as indicated by the heat legend on the left of the chart. A tooltip on this legend helps the user see where a country's data lies relative to the other countries. The map is zoomable through scrolling, clicking on the plus/minus buttons, and clicking on individual countries. Clicking on the home button will return the user back to the full world view and drag is enabled for navigation.

Clicking on a specific country will zoom the map into that country and display an interactive bar chart. 


## Development Process Overview

Sunny integrated the interactive amCharts map, and implemented the timeline, happiness factors, and information modal. She focused on displaying the data in an interactive way, allowing users to change the year selection and happiness factor selection. In total she spent about 8 hours and the most time consuming part of her work was getting the map functional and interactive in the intended way.
