from django.db import migrations


def enable_system_admin_staff_access(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(role='SYSTEM_ADMIN').update(is_staff=True)


def disable_system_admin_staff_access(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.filter(role='SYSTEM_ADMIN').update(is_staff=False)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_user_reports_to'),
    ]

    operations = [
        migrations.RunPython(
            enable_system_admin_staff_access,
            disable_system_admin_staff_access,
        ),
    ]
