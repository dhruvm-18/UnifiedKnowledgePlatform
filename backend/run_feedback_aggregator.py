import time
from feedback_learning import aggregate_feedback

if __name__ == '__main__':
    print('Starting feedback aggregation scheduler (every 1 hour)...')
    while True:
        aggregate_feedback()
        time.sleep(3600)  # 1 hour 