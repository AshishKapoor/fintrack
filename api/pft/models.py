from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.base_user import BaseUserManager



class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    # Override the groups field with a unique related_name
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='pft_user_set',
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    # Override the user_permissions field with a unique related_name
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='pft_user_set',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )

    DEPARTMENT_CHOICES = (
        ('engineering', 'Engineering'),
        ('finance', 'Finance'),
        ('hr', 'HR'),
        ('marketing', 'Marketing'),
        ('sales', 'Sales'),
        ('other', 'Other'),
    )

    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('employee', 'Employee'),
    )

    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    location = models.CharField(max_length=100, blank=True)
    bio = models.TextField(blank=True)
    department = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES, default='other')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='employee')

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email


# CATEGORY MODEL
class Category(models.Model):
    TYPE_CHOICES = (
        ("income", "Income"),
        ("expense", "Expense"),
    )

    name = models.CharField(max_length=100)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.type})"


# TRANSACTION MODEL
class Transaction(models.Model):
    TYPE_CHOICES = (
        ("income", "Income"),
        ("expense", "Expense"),
    )

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="transactions"
    )
    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, related_name="transactions"
    )
    transaction_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.amount} ({self.type})"


# BUDGET MODEL (Optional Feature)
class Budget(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="budgets")
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="budgets"
    )
    month = models.PositiveSmallIntegerField()  # 1 to 12
    year = models.PositiveIntegerField()
    amount_limit = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = ("user", "category", "month", "year")  # prevent duplicates

    def __str__(self):
        return f"{self.user.username} - {self.category.name} - {self.month}/{self.year}"
