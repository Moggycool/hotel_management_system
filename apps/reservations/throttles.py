from rest_framework.throttling import AnonRateThrottle


class PublicReadThrottle(AnonRateThrottle):
    rate = '60/minute'

    def get_rate(self):
        return self.rate


class PublicBookingThrottle(AnonRateThrottle):
    rate = '5/hour'

    def get_rate(self):
        return self.rate
