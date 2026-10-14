from rest_framework.throttling import AnonRateThrottle


class GuestFeedbackThrottle(AnonRateThrottle):
    rate = '5/hour'

    def get_rate(self):
        return self.rate
