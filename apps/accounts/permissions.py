from rest_framework.permissions import BasePermission
from apps.accounts.models import StaffRole


class HasRole(BasePermission):
    """
    Checks if authenticated user possesses one of the allowed roles.
    """
    allowed_roles = []

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role == StaffRole.SYSTEM_ADMIN or request.user.is_superuser:
            return True
        return request.user.role in self.allowed_roles


class IsGeneralManager(HasRole):
    allowed_roles = [StaffRole.GENERAL_MANAGER]


class IsFrontOfficeStaff(HasRole):
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.FRONT_OFFICE_MANAGER,
        StaffRole.RECEPTIONIST,
        StaffRole.CASHIER,
    ]


class IsReservationRoomAssignmentStaff(HasRole):
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.FRONT_OFFICE_MANAGER,
        StaffRole.RECEPTIONIST,
    ]


class IsFinanceStaff(HasRole):
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.FINANCE_OFFICER,
        StaffRole.CASHIER,
    ]


class IsHousekeepingStaff(HasRole):
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.HOUSEKEEPING_SUPERVISOR,
        StaffRole.HOUSEKEEPER,
    ]


class IsNightAuditStaff(HasRole):
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.FRONT_OFFICE_MANAGER,
        StaffRole.FINANCE_OFFICER,
        StaffRole.CASHIER,
    ]


class IsRestaurantStaff(HasRole):
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.FB_MANAGER,
        StaffRole.WAITER,
        StaffRole.EXECUTIVE_CHEF,
        StaffRole.CASHIER,
    ]


class IsRestaurantSettlementStaff(HasRole):
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.FB_MANAGER,
        StaffRole.CASHIER,
        StaffRole.FINANCE_OFFICER,
    ]


class IsRestaurantMenuManager(HasRole):
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.FB_MANAGER,
    ]


class IsInventoryStaff(HasRole):
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.STOREKEEPER,
        StaffRole.PURCHASING_OFFICER,
        StaffRole.EXECUTIVE_CHEF,
    ]


class IsRecipeManager(HasRole):
    allowed_roles = [
        StaffRole.GENERAL_MANAGER,
        StaffRole.FB_MANAGER,
        StaffRole.EXECUTIVE_CHEF,
    ]
