from setuptools import setup, find_packages

setup(
    name="testmyiq-ai",
    version="1.0.0",
    description="TestMyIQ.ai - Adaptive Cognitive Assessment Platform",
    packages=find_packages(),
    install_requires=[
        'flask',
        'flask-sqlalchemy',
        'flask-migrate',
        'flask-login'
    ],
)
