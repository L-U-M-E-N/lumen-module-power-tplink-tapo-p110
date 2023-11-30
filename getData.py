from PyP100 import PyP110

import sys

###################
# https://github.com/fishbigger/TapoP100/pull/87
###################
import json
import logging
import time

_LOGGER = logging.getLogger(__name__)

class P110B(PyP110.P110):
    def getEnergyData(self, startT, endT, intervalT):
        return self.request("get_energy_data", { "end_timestamp": endT, "interval": intervalT, "start_timestamp": startT})

###################

p110 = P110B(sys.argv[1], sys.argv[2], sys.argv[3]) #Creating a P110 plug object

p110.handshake() #Creates the cookies required for further methods
p110.login() #Sends credentials to the plug and creates AES Key and IV for further methods

#PyP110 has all PyP100 functions and additionally allows to query energy usage infos
#print(p110.getEnergyUsage()) #Returns dict with all the energy usage
print(p110.getEnergyData(int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])));