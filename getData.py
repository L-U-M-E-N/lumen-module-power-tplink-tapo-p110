from PyP100 import PyP110
import sys

p110 = PyP110.P110(sys.argv[1], sys.argv[2], sys.argv[3]) #Creating a P110 plug object

p110.handshake() #Creates the cookies required for further methods
p110.login() #Sends credentials to the plug and creates AES Key and IV for further methods

#PyP110 has all PyP100 functions and additionally allows to query energy usage infos
print(p110.getEnergyUsage()) #Returns dict with all the energy usage