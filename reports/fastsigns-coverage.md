# FASTSIGNS US coverage vs Procurity metros

Generated: 2026-09-09T03:29:03.708Z

- US locations parsed: **724**
- Geocoded OK: **651**
- Geocode failed: **73**
- Inside 8 covered metros: **72**
- Outside all 8: **579**

## Counts inside covered metros

| Metro | FASTSIGNS locations |
| --- | ---: |
| NYC (`nyc`) | 11 |
| Chicago (`chicago`) | 13 |
| Los Angeles (`los_angeles`) | 15 |
| San Francisco (`san_francisco`) | 7 |
| Boston (`boston`) | 3 |
| Seattle (`seattle`) | 7 |
| Fort Worth (`fort_worth`) | 8 |
| Miami-Dade (`miami_dade`) | 8 |
| **Total covered** | **72** |

## Outside coverage — top states (expansion priority)

| State | Locations | Highest-density cities |
| --- | ---: | --- |
| TX | 72 | Houston, TX (10); Dallas, TX (9); San Antonio, TX (5); Austin, TX (3); 2009 RR 620 N, Suite 720 Lakeway, TX (1) |
| FL | 55 | Orlando, FL (5); Jacksonville, FL (4); Tampa, FL (4); West Palm Beach, FL (2); Saint Petersburg, FL (2) |
| CA | 48 | San Diego, CA (6); Sacramento, CA (2); San Jose, CA (2); K-8 American Canyon, CA (1); Antioch, CA (1) |
| OH | 31 | Cincinnati, OH (4); Dayton, OH (3); Akron, OH (1); Blue Ash, OH (1); Broadview Heights, OH (1) |
| PA | 29 | Pittsburgh, PA (2); Allentown, PA (1); Conshohocken, PA (1); Doylestown, PA (1); Easton, PA (1) |
| GA | 23 | Atlanta, GA (3); Building 50, Suite 5 Lawrenceville, GA (1); Athens, GA (1); NE Atlanta, GA (1); Augusta, GA (1) |
| NC | 19 | Charlotte, NC (5); Raleigh, NC (2); Asheville, NC (1); Cary, NC (1); Concord, NC (1) |
| CO | 18 | Colorado Springs, CO (2); Denver, CO (2); Arvada, CO (1); Aurora, CO (1); Boulder, CO (1) |
| VA | 17 | Arlington, VA (1); Chesapeake, VA (1); Fairfax, VA (1); Lynchburg, VA (1); Fredericksburg, VA (1) |
| AZ | 16 | Tucson, AZ (3); Phoenix, AZ (3); Scottsdale, AZ (2); Chandler, AZ (1); Gilbert, AZ (1) |
| IL | 16 | Arlington Heights, IL (1); Bloomington, IL (1); Carpentersville, IL (1); 313 N Mattis, Ste 114 Champaign, IL (1); Crystal Lake, IL (1) |
| MI | 14 | Ann Arbor, MI (1); Birmingham, MI (1); Brighton, MI (1); Detroit, MI (1); Grand Rapids, MI (1) |
| NJ | 14 | 1743 Route 88 West Brick, NJ (1); Cherry Hill, NJ (1); 285 State Route 18 East Brunswick, NJ (1); 50 Route 10 W East Hanover, NJ (1); East Eatontown, NJ (1) |
| TN | 14 | Memphis, TN (2); Nashville, TN (2); Alcoa, TN (1); Franklin, TN (1); Chattanooga, TN (1) |
| MD | 13 | Baltimore, MD (3); Annapolis, MD (1); 3 Bethesda Metro Center, Suite B002 Bethesda, MD (1); Columbia, MD (1); Frederick, MD (1) |
| MN | 13 | Ham Lake, MN (1); Bloomington, MN (1); 42 Burnsville, MN (1); Minneapolis, MN (1); Eden Prairie, MN (1) |
| MO | 13 | Louis, MO (2); Saint Louis, MO (2); Valley Park, MO (1); Columbia, MO (1); 40, Ste 104 Independence, MO (1) |
| NY | 12 | Central Islip, NY (1); Cheektowaga, NY (1); Colonie, NY (1); Holbrook, NY (1); Kingston, NY (1) |
| WA | 12 | Auburn, WA (1); Everett, WA (1); Way, WA (1); Issaquah, WA (1); 1409 N Pittsburgh, Ste A Kennewick, WA (1) |
| WI | 12 | Appleton, WI (1); Eau Claire, WI (1); Green Bay, WI (1); 7536 Pershing Plaza Kenosha, WI (1); Madison, WI (1) |
| IN | 11 | Indianapolis, IN (4); Fort Wayne, IN (2); Bloomington, IN (1); Columbus, IN (1); Evansville, IN (1) |
| SC | 10 | Charleston, SC (2); Columbia, SC (2); Aiken, SC (1); Anderson, SC (1); Hilton Head Island, SC (1) |
| CT | 9 | Clinton, CT (1); Hartford, CT (1); Manchester, CT (1); Middletown, CT (1); Milford, CT (1) |
| LA | 9 | Metairie, LA (2); Baton Rouge, LA (1); Gonzales, LA (1); Lafayette, LA (1); Lake Charles, LA (1) |
| AL | 8 | Hoover, AL (1); Birmingham, AL (1); SE, Suite A5 Decatur, AL (1); Dothan, AL (1); Ste. A Huntsville, AL (1) |

## Notes

- Metro match uses bounding boxes (approximate metro extents).
- Source: public FASTSIGNS location directory (business name/address only).
- Geocoding: US Census Bureau public geocoder; see CSV for failures.
- Regenerate: `npx tsx scripts/fastsigns-coverage.ts`
