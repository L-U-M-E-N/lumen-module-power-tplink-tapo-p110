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
        URL = f"http://{self.ipAddress}/app?token={self.token}"
        Payload = {
            "method": "get_energy_data",
            "params":{ "end_timestamp": endT, "interval": intervalT, "start_timestamp": startT},
            "requestTimeMils": int(round(time.time() * 1000)),
        }

        headers = {
            "Cookie": self.cookie
        }

        EncryptedPayload = self.tpLinkCipher.encrypt(json.dumps(Payload))

        SecurePassthroughPayload = {
            "method":"securePassthrough",
            "params":{
                "request": EncryptedPayload
            }
        }
        _LOGGER.debug("getEnergyUsage %s", self.ipAddress)
        r = self.session.post(URL, json=SecurePassthroughPayload, headers=headers, timeout=2)

        decryptedResponse = self.tpLinkCipher.decrypt(r.json()["result"]["response"])

        return json.loads(decryptedResponse)

###################

p110 = P110B(sys.argv[1], sys.argv[2], sys.argv[3]) #Creating a P110 plug object

p110.handshake() #Creates the cookies required for further methods
p110.login() #Sends credentials to the plug and creates AES Key and IV for further methods

#PyP110 has all PyP100 functions and additionally allows to query energy usage infos
#print(p110.getEnergyUsage()) #Returns dict with all the energy usage
print(p110.getEnergyUsage()) 
print(p110.getEnergyData(int(sys.argv[4]), int(sys.argv[5]), 43200)) 
print(p110.getEnergyData(int(sys.argv[4]), int(sys.argv[5]), 1440)) 
print(p110.getEnergyData(int(sys.argv[4]), int(sys.argv[5]), 60)) 