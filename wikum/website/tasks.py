from celery import task, current_task
from celery.result import AsyncResult
from time import sleep


NUM_OBJ_TO_CREATE = 1000

# when this task is called, it will create 1000 objects in the database
@task()
def create_models():
    for i in range(1, NUM_OBJ_TO_CREATE+1):
        fn = 'Fn %s' % i
        ln = 'Ln %s' % i
  
        process_percent = int(100 * float(i) / float(NUM_OBJ_TO_CREATE))

        sleep(0.1)
        current_task.update_state(state='PROGRESS',
                                  meta={'process_percent': process_percent})