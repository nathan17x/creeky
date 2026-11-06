# Class - Networking

## Section 0 - Connect your computer to the network 
Task - EIC wants you to find a good spot for lunch but your internet isn't working
### Lesson 1 - What is a network? Link to the following:
https://www.youtube.com/watch?v=R45vj63SZfs&list=PLQVJk9oC5JKp_8F9LPa3Pv67boA80KLm1
Recommend watching all of this short series
### Lesson 2 - Use run/ncpa.cpl to open the legacy windows control panel network settings
- Click the interface you want and open properties/ipv4
(try to emulate windows 11 but keep the same windows 98 vibe)
### Lesson 3 - Set the IP address to something you know will be unique 
(set to 10.1.1.199)
### Lesson 4 - Set the gateway
Reminder about why this matters
Usually x.x.x.1
### Lesson 5 - Set the subnet mask
reminder why this matters
usually 255.255.255.0 
reminder about CIDR slash notation
### Lesson 6 - Ping the gateway to test the local connection
then ping 8.8.8.8 (success)
then ping google.com (should fail, don't explain yet)
### Lesson 7 - Set DNS address
reminder why this matters
use 10.1.20.2 as primary and 8.8.8.8 as secondary
ping google.com

---

## Section 1 - Log into a switch
Task - Fix the router panel connection
### Lesson 1 - Open CMD prompt
### Lesson 2 - Telnet into a switch
- explain briefly that there are two ways to connect to a switch's CLI (SSH and telnet)
- explain briefly what a CLI is
- mention that Arista switches natively support modern ssh but many lower-cost Cisco switches do not (without enabling less secure KEX algorithms on the client)
### Lesson 3 - Find the port 
### Lesson 4 - Move the port to VLAN 114
### Quiz
- do it all start to finish

